import EventEmitter from "events"
import fs from "fs"
import path from "path"
import moment from "moment"

const customLogs = path.join(__dirname, `../../public/logs/accessLogs/`)
fs.existsSync(customLogs) || fs.mkdirSync(customLogs, {recursive: true})
const eventEmitter = new EventEmitter()
eventEmitter.on("logging", (msg: any) => {
	if (process.env.DEBUG === "true") {
		/* eslint-disable */
		console.log(msg)
		/* eslint-enable */
	}

	const data: string = `
        CUSTOM LOGGING AT ${moment()
			.utcOffset("+05:30")
			.format("YYYY-MM-DD HH:mm:ss")} - ${
			typeof msg !== "string" ? JSON.stringify(msg) : msg
		}  ↵  
    `
	fs.appendFile(
		path.resolve(customLogs, `log_${moment().format("YYYY-MM-DD")}.log`),
		data,
		(err) => {
			if (err) {
				/* eslint-disable */
				console.log(err)
				console.error(err.message)
				/* eslint-enable */
			}
		}
	)
})

export default eventEmitter
