import bodyParser from "body-parser"
import compression from "compression"
import cors from "cors"
import * as dotenv from "dotenv"
import express, { Application } from "express"
import fs from "fs"
import helmet from "helmet"
import moment from "moment"
import morgan from "morgan"
import path from "path"
import { createStream } from "rotating-file-stream"
dotenv.config()

/* libs */
import eventEmitter from "./libs/logging"
import Validator from "./middlewares/Validator"

/* Middlewares */
import ApiMiddlewares from "./middlewares/ApiMiddlewares"
import { sendEmail } from "./utils/helper"
// import SlugValidation from "./middlewares/SlugValidation"

const port: number = parseInt(process.env.PORT as string) || 5022
const app: Application = express()

// For support file
app.use("/public", express.static(path.join(__dirname, "../", "public")))

// Environments
const SUPPORTED_ENVS = ["development", "staging", "production"]

if (
	!process.env.ENVIRONMENT ||
	!SUPPORTED_ENVS.includes(process.env.ENVIRONMENT)
) {
	const supported = SUPPORTED_ENVS.map((env) => JSON.stringify(env)).join(
		", "
	)

	eventEmitter.emit(
		"logging",
		`ENVIRONMENT=${process.env.ENVIRONMENT} is not supported. Supported values: ${supported}`
	)
	process.exit()
}

// common logs
const todayDate = moment().format("YYYY-MM-DD")
const logFileName = `log_${todayDate}.log`

// access logs directory
const accessLogDirectory = path.join(__dirname, "../public/logs/accessLogs")
fs.existsSync(accessLogDirectory) ||
	fs.mkdirSync(accessLogDirectory, {recursive: true})

const accessLogStream = createStream(logFileName, {
	interval: "1d", // rotate daily
	path: accessLogDirectory
})

// access logs
app.use(
	morgan("common", {
		stream: accessLogStream
	})
)

// error logs directory
const errorLogDirectory = path.join(__dirname, "../public/logs/errorLogs")
fs.existsSync(errorLogDirectory) ||
	fs.mkdirSync(errorLogDirectory, {recursive: true})

const errorLogStream = createStream(logFileName, {
	interval: "1d", // rotate daily
	path: errorLogDirectory
})

// error logs
app.use(
	morgan("dev", {
		skip: function (req, res) {
			return res.statusCode < 400
		},
		stream: errorLogStream
	})
)

// multer directory
const uploadDir = path.join(__dirname, "../public/uploads/")
fs.existsSync(uploadDir) || fs.mkdirSync(uploadDir, {recursive: true})

// Access-Control-Allow-Origin
app.use(ApiMiddlewares.accessControl)

// utils and heplers
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(path.join(__dirname, "../", "public")))
// @ts-ignore
app.use(compression())
app.use(ApiMiddlewares.optionsMiddleware)

// use helmet
app.use(helmet.contentSecurityPolicy())
app.use(helmet.crossOriginEmbedderPolicy())
app.use(helmet.crossOriginOpenerPolicy())
app.use(helmet.crossOriginResourcePolicy())
app.use(helmet.dnsPrefetchControl())
app.use(helmet.frameguard())
app.use(helmet.hidePoweredBy())
app.use(helmet.hsts())
app.use(helmet.ieNoOpen())
app.use(helmet.noSniff())
app.use(helmet.originAgentCluster())
app.use(helmet.permittedCrossDomainPolicies())
app.use(helmet.referrerPolicy())
app.use(helmet.xssFilter())

// middlewares
// app.use(Validator.validateToken)
app.post("/v1/send-email", async (req, res, next) => {
	try {
		await sendEmail(Number(req.body.emailType ?? 9999999), req.body.payload)
		return res.json({ message: 'Email sent successfully!' })
	} catch (error) {
		next(error)
	}
})

app.use("*", ApiMiddlewares.middleware404)
app.use(ApiMiddlewares.exceptionHandler)

app.listen(port, async () => {
	eventEmitter.emit("logging", `Auth ms is up and running on port: ${port}`)
})
