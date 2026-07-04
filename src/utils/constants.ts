export const EMAIL_TEMPLATE_TYPE = {
	1: {
		fileName: "mfm_email.ejs",
		subject: "🎯 Hot Lead Incoming – Details Inside!",
		email: "mfmdelhi24@gmail.com"
	},
	2: {
		fileName: "thrive_nest_email.ejs",
		subject: "🎯 Hot Lead Incoming – Details Inside!",
		email: "soumas9277@gmail.com"
	},
	3: {
		fileName: "leads_thrive_nest_email.ejs",
		subject: "💼 New Website Inquiry | Thrive Nest Labs",
		email: "soumas9277@gmail.com"
	}
}

export const ALLOWED_EMAIL_TEMPLATE_TYPES = [1, 2, 3]

export const OUTBOUND_EMAIL_TEMPLATE_TYPE = {
	1: {
		fileName: "query_registered_email.ejs",
		subject: "We received your query | Tech Square Nest"
	}
}

export const ALLOWED_OUTBOUND_EMAIL_TEMPLATE_TYPES = [1]

export const DEFAULT_OUTBOUND_EMAIL_TYPE = 1
