from transformers import pipeline

summarizer = pipeline(
    "summarization",
    model="facebook/bart-large-cnn"
)


def generate_summary(text):

    max_chunk = 1000

    chunks = [
        text[i:i + max_chunk]
        for i in range(0, len(text), max_chunk)
    ]

    summaries = []

    for chunk in chunks[:3]:

        summary = summarizer(
            chunk,
            max_length=120,
            min_length=40,
            do_sample=False
        )

        summaries.append(summary[0]['summary_text'])

    final_summary = " ".join(summaries)

    return final_summary