"""The AI seam: turns transcripts into actual study notes.

BART could only compress what it was given, so a tutorial transcript came back as
narration — "in this lecture I'm going to show you decorators" rather than what a
decorator is. An instruct model can be *told* what to extract, which is the whole
reason for this module.

Two providers sit behind one interface — is_available(), chat(), chat_batch()
and BATCH_SIZE — so summarizer.py and study_tools.py never learn which is in
use:

  gemini (default) — production. An HTTPS call, so the production image needs
    no torch at all. Implemented in gemini.py.

  local — Qwen2.5 through torch on a CUDA GPU, for development. Selected
    explicitly, never as an automatic fallback: silently starting a 3.1GB model
    load because a production API key was missing would turn a config mistake
    into an out-of-memory crash on a machine that has no GPU anyway.

Both are greedy/deterministic, so the same video keeps producing the same notes.

Same routing shape as transcript.py, which picks between Supadata and the local
YouTube library.
"""

import os

# Reduces allocator fragmentation from the large short-lived tensors generation
# creates. Unsupported on Windows (torch warns and ignores it), so it helps on
# Linux only - the OOM this addressed was actually caused by transformers <4.45
# materializing logits for every prompt position; see requirements.txt.
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")

# torch and transformers are imported lazily, inside the functions that need
# them. They are ~4.2GB installed and exist only for the local Qwen path; the
# production image ships neither, and importing them here would make `import
# app` fail outright on a container that has no ML stack.

# 1.5B in fp16 is ~3.1GB, which leaves comfortable KV-cache headroom on a 6GB
# card. Bigger variants only fit with 4-bit quantization, and bitsandbytes on
# Windows is a dependency worth avoiding.
_DEFAULT_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"

_MODEL_NAME = os.getenv("NOTETUBE_LLM_MODEL") or _DEFAULT_MODEL

# Prompts are large (a ~10k-char transcript chunk), so the batch is bounded by
# KV-cache memory rather than compute. 4 measured ~2.3x faster than 2 on a 6GB
# card; 8 failed to allocate. Lower this first if generation starts OOMing.
# On the Gemini path this only groups the caller's loop; requests are still
# issued one at a time.
BATCH_SIZE = int(os.getenv("NOTETUBE_LLM_BATCH") or 4)

_GEMINI = "gemini"
_LOCAL = "local"
_DEFAULT_PROVIDER = _GEMINI


def _provider():
    return (os.getenv("NOTETUBE_LLM_PROVIDER") or _DEFAULT_PROVIDER).strip().lower()

_model = None
_tokenizer = None
_load_error = None


def _wanted_device():
    """CUDA unless explicitly disabled. Mirrors summarizer._resolve_device."""
    requested = (os.getenv("NOTETUBE_DEVICE") or "").strip().lower()

    if requested == "cpu":
        return None

    try:
        import torch
    except ImportError:
        return None

    if not torch.cuda.is_available():
        return None

    return "cuda"


def _load():
    """Load the model once. Records failures instead of raising so a missing
    download or too little VRAM degrades to the BART path rather than taking
    the whole backend down at import."""
    global _model, _tokenizer, _load_error

    if _model is not None or _load_error is not None:
        return

    device = _wanted_device()
    if device is None:
        _load_error = "no CUDA device (or NOTETUBE_DEVICE=cpu); using BART fallback"
        print("[llm] %s" % _load_error, flush=True)
        return

    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        tokenizer = AutoTokenizer.from_pretrained(_MODEL_NAME)
        model = AutoModelForCausalLM.from_pretrained(
            _MODEL_NAME,
            torch_dtype=torch.float16,
        ).to(device)
        model.eval()

        # Batched generation left-pads so every sequence ends at the same index
        # and the model keeps generating from the true end of each prompt.
        tokenizer.padding_side = "left"
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        # Qwen ships sampling defaults (temperature/top_p/top_k) in its
        # generation config; with greedy decoding they are unused and only
        # produce a warning on every single call.
        for field in ("temperature", "top_p", "top_k"):
            if hasattr(model.generation_config, field):
                setattr(model.generation_config, field, None)

        if os.getenv("NOTETUBE_COMPILE") == "1":
            # Worth it only for a long-running server on a steady workload:
            # ~116 tok/s vs 47, but every distinct prompt shape triggers a
            # fresh ~160s compilation, which a short video would never repay.
            print("[llm] compiling (first generation will be slow)", flush=True)
            model.forward = torch.compile(
                model.forward, mode="reduce-overhead", fullgraph=True
            )

        _tokenizer = tokenizer
        _model = model

        print(
            "[llm] loaded %s on %s (%.1fGB VRAM in use)"
            % (_MODEL_NAME, torch.cuda.get_device_name(0),
               torch.cuda.memory_allocated() / 1e9),
            flush=True,
        )

    except Exception as exc:  # noqa: BLE001 - any failure means fall back
        _load_error = "%s: %s" % (type(exc).__name__, exc)
        print("[llm] load failed (%s); using BART fallback" % _load_error, flush=True)


def is_available():
    """True when the configured provider is usable.

    Means "configured and ready to try", not "the last call succeeded" — for
    Gemini this checks the key and SDK without spending a request. A provider
    that is available but then fails raises rather than returning nothing, so a
    real outage is never mistaken for an empty result.
    """
    provider = _provider()

    if provider == _GEMINI:
        import gemini

        return gemini.is_configured()

    if provider == _LOCAL:
        _load()
        return _model is not None

    print("[llm] unknown NOTETUBE_LLM_PROVIDER %r" % provider, flush=True)
    return False


def _render(system, user):
    return _tokenizer.apply_chat_template(
        [{"role": "system", "content": system},
         {"role": "user", "content": user}],
        tokenize=False,
        add_generation_prompt=True,
    )


def chat_batch(system, users, max_new_tokens=512):
    """Run one prompt per entry in `users`, returning replies in the same order.

    Returns [] if no provider is configured, so callers can fall back. A
    configured provider that then fails raises instead — see is_available().
    """
    if not users or not is_available():
        return []

    if _provider() == _GEMINI:
        import gemini

        # One request per prompt, sequentially. Gemini has no batch endpoint
        # here, and firing the whole batch concurrently is the quickest way to
        # trip the free tier's rate limit for a project this size.
        return [
            gemini.generate(system, user, max_new_tokens).strip()
            for user in users
        ]

    replies = []

    for start in range(0, len(users), BATCH_SIZE):
        batch = users[start:start + BATCH_SIZE]
        replies.extend(_generate(system, batch, max_new_tokens))

    return [r.strip() for r in replies]


def _generate(system, batch, max_new_tokens):
    """Generate for one batch, halving it on OOM rather than failing.

    Peak memory scales with batch size times prompt length, and a long
    transcript chunk makes both large. Splitting is far better than losing the
    user's whole request.
    """
    import torch

    prompts = [_render(system, u) for u in batch]

    encoded = _tokenizer(
        prompts,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=8192,
    ).to(_model.device)

    try:
        with torch.inference_mode():
            generated = _model.generate(
                **encoded,
                max_new_tokens=max_new_tokens,
                do_sample=False,
                pad_token_id=_tokenizer.pad_token_id,
                # A pre-allocated cache instead of one regrown every step.
                # Measured 2.4x faster here (20 -> 47 tok/s at batch 4): decode
                # is bound by per-step overhead on this GPU, not bandwidth.
                cache_implementation="static",
            )

    except torch.cuda.OutOfMemoryError:
        del encoded
        torch.cuda.empty_cache()

        if len(batch) == 1:
            print("[llm] OOM on a single prompt; skipping it", flush=True)
            return [""]

        half = len(batch) // 2
        print(
            "[llm] OOM at batch %d; retrying as %d + %d"
            % (len(batch), half, len(batch) - half),
            flush=True,
        )
        return (
            _generate(system, batch[:half], max_new_tokens)
            + _generate(system, batch[half:], max_new_tokens)
        )

    # Trim the prompt off each sequence; left padding means every prompt ends
    # at the same column, so one slice works for the whole batch.
    new_tokens = generated[:, encoded["input_ids"].shape[1]:]
    decoded = _tokenizer.batch_decode(new_tokens, skip_special_tokens=True)

    # Large transients from generation are freed eagerly; the next batch needs
    # the room and the allocator will not return it on its own.
    del encoded, generated, new_tokens
    torch.cuda.empty_cache()

    return decoded


def chat(system, user, max_new_tokens=512):
    """Single-prompt convenience wrapper. Returns "" if unavailable."""
    replies = chat_batch(system, [user], max_new_tokens=max_new_tokens)
    return replies[0] if replies else ""
