export const legalLastUpdated = "August 30, 2026"

export const privacySections = [
  {
    title: "1. Information we collect",
    body: [
      "Account information: when you sign up, we store your name, email address, and a securely hashed version of your password (we never store your password in plain text).",
      "Content you submit: the YouTube URLs you paste in, and the notes, flashcards, and quizzes generated from them, are stored against your account so you can revisit them later.",
      "Local session data: your login token, name, and email are cached in your browser's local storage so you stay signed in between visits. This data lives only on your device.",
    ],
  },
  {
    title: "2. How we use your information",
    body: [
      "To create and manage your account, authenticate you, and keep your generated study materials tied to your profile.",
      "To process the YouTube videos you submit — fetching the transcript and generating summaries, flashcards, and quizzes.",
      "To improve the reliability and quality of NoteTube AI. We do not sell your personal information to third parties.",
    ],
  },
  {
    title: "3. Third-party services",
    body: [
      "We fetch transcripts directly from YouTube for the videos you submit. Summarization and question generation run on models we host ourselves — your notes are not sent to an external AI API for processing.",
      "We do not use a third-party email provider. If you request a password reset, the reset link is issued directly rather than emailed, as this project does not currently have an email service configured.",
    ],
  },
  {
    title: "4. Data storage & security",
    body: [
      "Your data is stored in a MongoDB database. Passwords are hashed with bcrypt before being saved — we never have access to your raw password.",
      "Access to your account is protected by a signed JSON Web Token (JWT). Treat your login credentials as confidential and avoid using NoteTube AI on shared or untrusted devices.",
    ],
  },
  {
    title: "5. Your choices",
    body: [
      "You can update your profile details from the Settings page at any time.",
      "You can log out at any point, which clears your session token and cached details from local storage on that device.",
      "To request deletion of your account and associated notes, contact us using the details below.",
    ],
  },
  {
    title: "6. Changes to this policy",
    body: [
      "This is a student project built for educational purposes. This policy may be updated as the project evolves, and changes will be reflected on this page.",
    ],
  },
  {
    title: "7. Contact",
    body: [
      "Questions about this policy or your data can be directed to the project maintainer.",
    ],
  },
]

export const termsSections = [
  {
    title: "1. Acceptance of terms",
    body: [
      "By creating an account or using NoteTube AI, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the service.",
    ],
  },
  {
    title: "2. What NoteTube AI does",
    body: [
      "NoteTube AI lets you submit a YouTube video URL and generates notes, flashcards, and quizzes from that video's transcript. It is intended as a study aid, not a substitute for watching the source material or your own coursework.",
      "Generated content is produced automatically and may be incomplete, out of context, or contain inaccuracies. Always verify important information against the original lecture.",
    ],
  },
  {
    title: "3. Your account",
    body: [
      "You're responsible for keeping your login credentials confidential and for all activity under your account. Use a password you don't reuse elsewhere.",
      "You must provide accurate information when signing up. You may update or delete your account details from Settings, or by contacting us.",
    ],
  },
  {
    title: "4. Acceptable use",
    body: [
      "Only submit YouTube videos you have the right to access and use for this purpose. Don't use NoteTube AI to infringe copyright, harass others, or attempt to disrupt or abuse the service (including excessive automated requests).",
      "You're responsible for the content of the videos you submit and how you use the generated materials.",
    ],
  },
  {
    title: "5. Content ownership",
    body: [
      "You retain ownership of nothing beyond your account information — the source videos remain the property of their respective creators on YouTube. Notes, flashcards, and quizzes generated for your account are yours to use for personal study.",
    ],
  },
  {
    title: "6. Disclaimers & limitation of liability",
    body: [
      "NoteTube AI is provided \"as is,\" as a student project, without warranties of any kind, express or implied. We don't guarantee the service will be uninterrupted, error-free, or that generated content will be accurate or complete.",
      "To the fullest extent permitted by law, NoteTube AI and its creator aren't liable for any damages arising from your use of, or inability to use, the service.",
    ],
  },
  {
    title: "7. Termination",
    body: [
      "You may stop using NoteTube AI and request account deletion at any time. We may suspend or terminate access for accounts that violate these terms.",
    ],
  },
  {
    title: "8. Changes to these terms",
    body: [
      "These terms may be updated as the project evolves. Continued use of NoteTube AI after changes are posted means you accept the updated terms.",
    ],
  },
  {
    title: "9. Contact",
    body: [
      "Questions about these terms can be directed to the project maintainer.",
    ],
  },
]
