import nodemailer from "nodemailer"
import eventEmitter from "../libs/logging"
import {regexEmail} from "../utils/helper"

const outboundTransporter = nodemailer.createTransport({
	host: process.env.NODEMAILER_OUTBOUND_HOST,
	port: Number(process.env.NODEMAILER_OUTBOUND_PORT),
	secure: false,
	auth: {
		user: process.env.NODEMAILER_OUTBOUND_USER_EMAIL,
		pass: process.env.NODEMAILER_OUTBOUND_PASSWORD
	}
})

export type CrmEmailAttachment = {
	filename: string
	content: string
	contentType?: string
}

export type CrmEmailPayload = {
	to: string | string[]
	cc?: string | string[]
	bcc?: string | string[]
	subject: string
	body: string
	isHtml?: boolean
	attachments?: CrmEmailAttachment[]
}

function normalizeRecipients(value: string | string[] | undefined): string[] {
	const recipients = (Array.isArray(value) ? value : value ? [value] : [])
		.map((email) => (email ?? "").toString().trim())
		.filter((email) => email !== "")

	return [...new Set(recipients)]
}

async function validateRecipients(recipients: string[], fieldName: string) {
	for (const recipient of recipients) {
		if (!(await regexEmail(recipient))) {
			throw new Error(`Invalid ${fieldName} email: ${recipient}`)
		}
	}
}

function assertOutboundConfigured() {
	if (
		!process.env.NODEMAILER_OUTBOUND_HOST ||
		!process.env.NODEMAILER_OUTBOUND_PORT ||
		!process.env.NODEMAILER_OUTBOUND_USER_EMAIL ||
		!process.env.NODEMAILER_OUTBOUND_PASSWORD ||
		!process.env.NODEMAILER_OUTBOUND_FROM
	) {
		throw new Error(
			"Outbound email is not configured. Add NODEMAILER_OUTBOUND_* variables to .env."
		)
	}
}

export async function sendCrmEmail(payload: CrmEmailPayload) {
	assertOutboundConfigured()

	const to = normalizeRecipients(payload.to)
	const cc = normalizeRecipients(payload.cc)
	const bcc = normalizeRecipients(payload.bcc)
	const subject = (payload.subject ?? "").toString().trim()
	const body = (payload.body ?? "").toString()
	const isHtml = payload.isHtml !== false

	if (!to.length) {
		throw new Error("Recipient email (to) is required")
	}

	if (!subject) {
		throw new Error("Subject is required")
	}

	if (!body.trim()) {
		throw new Error("Body is required")
	}

	await validateRecipients(to, "to")
	await validateRecipients(cc, "cc")
	await validateRecipients(bcc, "bcc")

	const attachments = (payload.attachments ?? []).map((attachment, index) => {
		const filename = (attachment.filename ?? "").toString().trim()
		const content = (attachment.content ?? "").toString().trim()

		if (!filename) {
			throw new Error(`Attachment at index ${index} is missing filename`)
		}

		if (!content) {
			throw new Error(`Attachment at index ${index} is missing content`)
		}

		return {
			filename,
			content: Buffer.from(content, "base64"),
			contentType: attachment.contentType ?? "application/octet-stream"
		}
	})

	const message = {
		from: process.env.NODEMAILER_OUTBOUND_FROM as string,
		to,
		cc: cc.length ? cc : undefined,
		bcc: bcc.length ? bcc : undefined,
		subject,
		...(isHtml ? {html: body} : {text: body}),
		attachments: attachments.length ? attachments : undefined
	}

	return new Promise((resolve, reject) => {
		outboundTransporter.sendMail(message, function (error, info) {
			if (error) {
				eventEmitter.emit("logging", error?.message)
				return reject(error)
			}

			return resolve(info)
		})
	})
}
