import {GmailMailboxLabel} from "./constants"
import {getAuthenticatedGmailClient} from "./gmailClient"
import {
	getHeaderValue,
	normalizeMailboxLabel,
	normalizePageSize,
	parseAttachments,
	parseMessageBody
} from "./gmailUtils"

type ListMessagesOptions = {
	label?: string
	pageToken?: string
	maxResults?: number
}

function isUnread(labelIds: string[] | undefined | null): boolean {
	return (labelIds ?? []).includes("UNREAD")
}

async function getMessageSummary(messageId: string) {
	const gmail = getAuthenticatedGmailClient()
	const response = await gmail.users.messages.get({
		userId: "me",
		id: messageId,
		format: "metadata",
		metadataHeaders: ["From", "To", "Subject", "Date"]
	})

	const headers = response.data.payload?.headers

	return {
		id: response.data.id,
		threadId: response.data.threadId,
		from: getHeaderValue(headers, "From"),
		to: getHeaderValue(headers, "To"),
		subject: getHeaderValue(headers, "Subject"),
		receivedAt: getHeaderValue(headers, "Date"),
		preview: response.data.snippet ?? "",
		unread: isUnread(response.data.labelIds),
		labels: response.data.labelIds ?? []
	}
}

export async function listGmailLabels() {
	const gmail = getAuthenticatedGmailClient()
	const response = await gmail.users.labels.list({
		userId: "me"
	})

	return (response.data.labels ?? []).map((label) => ({
		id: label.id,
		name: label.name,
		type: label.type,
		messageTotal: label.messagesTotal ?? 0,
		messageUnread: label.messagesUnread ?? 0
	}))
}

export async function listGmailMessages(options: ListMessagesOptions = {}) {
	const label: GmailMailboxLabel = normalizeMailboxLabel(options.label)
	const maxResults = normalizePageSize(options.maxResults)
	const gmail = getAuthenticatedGmailClient()

	const response = await gmail.users.messages.list({
		userId: "me",
		labelIds: [label],
		pageToken: options.pageToken,
		maxResults
	})

	const messageIds = (response.data.messages ?? [])
		.map((message) => message.id)
		.filter((id): id is string => Boolean(id))

	const messages = await Promise.all(
		messageIds.map((messageId) => getMessageSummary(messageId))
	)

	return {
		label,
		messages,
		nextPageToken: response.data.nextPageToken ?? null,
		resultSizeEstimate: response.data.resultSizeEstimate ?? messages.length
	}
}

export async function getGmailMessage(messageId: string) {
	const gmail = getAuthenticatedGmailClient()
	const response = await gmail.users.messages.get({
		userId: "me",
		id: messageId,
		format: "full"
	})

	const payload = response.data.payload
	const headers = payload?.headers
	const body = parseMessageBody(payload)

	return {
		id: response.data.id,
		threadId: response.data.threadId,
		from: getHeaderValue(headers, "From"),
		to: getHeaderValue(headers, "To"),
		cc: getHeaderValue(headers, "Cc"),
		bcc: getHeaderValue(headers, "Bcc"),
		replyTo: getHeaderValue(headers, "Reply-To"),
		subject: getHeaderValue(headers, "Subject"),
		receivedAt: getHeaderValue(headers, "Date"),
		preview: response.data.snippet ?? "",
		unread: isUnread(response.data.labelIds),
		labels: response.data.labelIds ?? [],
		body,
		attachments: parseAttachments(payload)
	}
}

export async function markGmailMessageAsRead(messageId: string) {
	const gmail = getAuthenticatedGmailClient()

	await gmail.users.messages.modify({
		userId: "me",
		id: messageId,
		requestBody: {
			removeLabelIds: ["UNREAD"]
		}
	})

	return {id: messageId, unread: false}
}

export async function markGmailMessageAsUnread(messageId: string) {
	const gmail = getAuthenticatedGmailClient()

	await gmail.users.messages.modify({
		userId: "me",
		id: messageId,
		requestBody: {
			addLabelIds: ["UNREAD"]
		}
	})

	return {id: messageId, unread: true}
}

export async function deleteGmailMessage(messageId: string, permanent = false) {
	const gmail = getAuthenticatedGmailClient()

	if (permanent) {
		await gmail.users.messages.delete({
			userId: "me",
			id: messageId
		})

		return {id: messageId, deleted: true, permanent: true}
	}

	await gmail.users.messages.trash({
		userId: "me",
		id: messageId
	})

	return {id: messageId, deleted: true, permanent: false}
}
