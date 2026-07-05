export const GMAIL_SCOPES = [
	"https://www.googleapis.com/auth/gmail.readonly",
	"https://www.googleapis.com/auth/gmail.modify"
]

export const GMAIL_MAILBOX_LABELS = [
	"INBOX",
	"SPAM",
	"TRASH",
	"SENT",
	"DRAFT",
	"STARRED",
	"IMPORTANT"
] as const

export type GmailMailboxLabel = (typeof GMAIL_MAILBOX_LABELS)[number]

export const DEFAULT_GMAIL_MAILBOX: GmailMailboxLabel = "INBOX"

export const DEFAULT_GMAIL_PAGE_SIZE = 20

export const MAX_GMAIL_PAGE_SIZE = 100
