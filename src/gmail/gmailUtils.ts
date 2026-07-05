import {GmailMailboxLabel} from "./constants"

type GmailHeader = {
	name?: string | null
	value?: string | null
}

type GmailMessagePart = {
	mimeType?: string | null
	body?: {
		data?: string | null
		attachmentId?: string | null
		size?: number | null
	} | null
	filename?: string | null
	parts?: GmailMessagePart[] | null
}

export type ParsedGmailBody = {
	text: string | null
	html: string | null
}

export type ParsedGmailAttachment = {
	id: string
	filename: string
	mimeType: string
	size: number
}

function decodeBase64Url(data: string): string {
	const normalized = data.replace(/-/g, "+").replace(/_/g, "/")
	const padded = normalized.padEnd(
		normalized.length + ((4 - (normalized.length % 4)) % 4),
		"="
	)

	return Buffer.from(padded, "base64").toString("utf8")
}

export function getHeaderValue(
	headers: GmailHeader[] | undefined,
	name: string
): string | null {
	const header = (headers ?? []).find(
		(item) => item.name?.toLowerCase() === name.toLowerCase()
	)

	return header?.value ?? null
}

function collectBodyParts(
	part: GmailMessagePart | undefined | null,
	accumulator: ParsedGmailBody
) {
	if (!part) {
		return
	}

	if (part.body?.data) {
		const decoded = decodeBase64Url(part.body.data)

		if (part.mimeType === "text/plain" && !accumulator.text) {
			accumulator.text = decoded
		}

		if (part.mimeType === "text/html" && !accumulator.html) {
			accumulator.html = decoded
		}
	}

	for (const child of part.parts ?? []) {
		collectBodyParts(child, accumulator)
	}
}

export function parseMessageBody(payload: GmailMessagePart | undefined | null) {
	const body: ParsedGmailBody = {
		text: null,
		html: null
	}

	collectBodyParts(payload, body)

	return body
}

export function parseAttachments(
	payload: GmailMessagePart | undefined | null
): ParsedGmailAttachment[] {
	const attachments: ParsedGmailAttachment[] = []

	function walk(part: GmailMessagePart | undefined | null) {
		if (!part) {
			return
		}

		if (part.body?.attachmentId) {
			attachments.push({
				id: part.body.attachmentId,
				filename: part.filename ?? "attachment",
				mimeType: part.mimeType ?? "application/octet-stream",
				size: part.body.size ?? 0
			})
		}

		for (const child of part.parts ?? []) {
			walk(child)
		}
	}

	walk(payload)

	return attachments
}

export function isAllowedMailboxLabel(
	label: string
): label is GmailMailboxLabel {
	return [
		"INBOX",
		"SPAM",
		"TRASH",
		"SENT",
		"DRAFT",
		"STARRED",
		"IMPORTANT"
	].includes(label)
}

export function normalizeMailboxLabel(label?: string): GmailMailboxLabel {
	const normalized = (label ?? "INBOX").trim().toUpperCase()

	if (!isAllowedMailboxLabel(normalized)) {
		throw new Error(`Unsupported mailbox label: ${label}`)
	}

	return normalized
}

export function normalizePageSize(maxResults?: number): number {
	const parsed = Number(maxResults ?? 20)

	if (Number.isNaN(parsed) || parsed < 1) {
		return 20
	}

	return Math.min(parsed, 100)
}
