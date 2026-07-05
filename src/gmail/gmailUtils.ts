import {GmailMailboxLabel} from "./constants"

type GmailHeader = {
	name?: string | null
	value?: string | null
}

type GmailMessagePart = {
	partId?: string | null
	mimeType?: string | null
	headers?: GmailHeader[] | null
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

function getFilenameFromPart(part: GmailMessagePart): string | null {
	const direct = (part.filename ?? "").trim()
	if (direct) {
		return direct
	}

	const contentType = getHeaderValue(
		part.headers ?? undefined,
		"Content-Type"
	)
	if (contentType) {
		const nameMatch =
			contentType.match(/name="([^"]+)"/i) ??
			contentType.match(/name=([^;\s]+)/i)
		if (nameMatch?.[1]) {
			return nameMatch[1].trim().replace(/^["']|["']$/g, "")
		}
	}

	const disposition = getHeaderValue(
		part.headers ?? undefined,
		"Content-Disposition"
	)
	if (disposition) {
		const encodedMatch = disposition.match(/filename\*=UTF-8''([^;\s]+)/i)
		if (encodedMatch?.[1]) {
			try {
				return decodeURIComponent(encodedMatch[1].trim())
			} catch {
				return encodedMatch[1].trim()
			}
		}

		const quotedMatch =
			disposition.match(/filename="([^"]+)"/i) ??
			disposition.match(/filename=([^;\s]+)/i)
		if (quotedMatch?.[1]) {
			return quotedMatch[1].trim().replace(/^["']|["']$/g, "")
		}
	}

	return null
}

function isContainerMimeType(mimeType: string | null | undefined): boolean {
	return (mimeType ?? "").toLowerCase().startsWith("multipart/")
}

function isBodyMimeType(mimeType: string | null | undefined): boolean {
	const mime = (mimeType ?? "").toLowerCase()
	return mime === "text/plain" || mime === "text/html"
}

function isAttachmentPart(part: GmailMessagePart): boolean {
	const mimeType = (part.mimeType ?? "application/octet-stream").toLowerCase()

	if (isContainerMimeType(mimeType)) {
		return false
	}

	const filename = getFilenameFromPart(part)
	const hasPayload =
		Boolean(part.body?.attachmentId) ||
		Boolean(part.body?.data) ||
		(part.body?.size ?? 0) > 0

	if (part.body?.attachmentId) {
		return true
	}

	if (!hasPayload) {
		return false
	}

	if (filename) {
		return !isBodyMimeType(mimeType) || Boolean(part.body?.attachmentId)
	}

	const disposition = (
		getHeaderValue(part.headers ?? undefined, "Content-Disposition") ?? ""
	).toLowerCase()

	return disposition.includes("attachment")
}

export function findMessagePartById(
	payload: GmailMessagePart | undefined | null,
	partId: string
): GmailMessagePart | null {
	if (!payload) {
		return null
	}

	if (payload.partId === partId) {
		return payload
	}

	for (const child of payload.parts ?? []) {
		const match = findMessagePartById(child, partId)
		if (match) {
			return match
		}
	}

	return null
}

export function parseAttachments(
	payload: GmailMessagePart | undefined | null
): ParsedGmailAttachment[] {
	const attachments: ParsedGmailAttachment[] = []
	const seen = new Set<string>()

	function walk(part: GmailMessagePart | undefined | null) {
		if (!part) {
			return
		}

		if (isAttachmentPart(part)) {
			const filename = getFilenameFromPart(part) ?? "attachment"
			const mimeType = part.mimeType ?? "application/octet-stream"
			const id =
				part.body?.attachmentId ??
				(part.partId
					? `part:${part.partId}`
					: `${filename}:${attachments.length}`)
			const dedupeKey = `${id}:${filename}`

			if (!seen.has(dedupeKey)) {
				seen.add(dedupeKey)
				attachments.push({
					id,
					filename,
					mimeType,
					size: part.body?.size ?? 0
				})
			}
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
