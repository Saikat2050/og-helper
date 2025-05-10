import axios from "axios"
import eventEmitter from "../libs/logging"

class AxiosHelper {
	private baseUrl: string
	private endPoint: string = ""
	private headers: object
	private data: any = {}
	private params: any = {}
	private timeout: number
	private method: string = "GET"
	// private responseType: ResponseType | undefined;

	constructor(baseUrl, headers = undefined, timeout = 10000) {
		this.baseUrl = baseUrl
		this.headers = headers || {"Content-Type": "application/json"}
		this.timeout = timeout || 10000
	}

	public async request(
		endPoint: string = "",
		headers: object = {},
		method: string = "GET",
		data?: any,
		params?: any,
		timeout?: number,
		options: any = {}
	): Promise<any> {
		this.endPoint = endPoint
		this.headers = {...this.headers, ...headers}
		this.data = data
		this.params = params
		this.timeout = timeout || this.timeout
		this.method = method || this.method
		// this.responseType = responseType || this.responseType;

		const axiosConfig = {
			baseURL: this.baseUrl,
			url: this.endPoint,
			headers: this.headers,
			data: this.data,
			params: this.params,
			timeout: this.timeout,
			method: this.method,
			// responseType: this.responseType,
			validateStatus: (status) => {
				return status >= 200 && status < 300
			},
			...options
		}

		try {
			// Will remove this
			eventEmitter.emit(
				"logging",
				`Axios payload - ${JSON.stringify(axiosConfig)}`
			)
			const response = await axios(axiosConfig)

			return response.data || response
		} catch (error: any) {
			eventEmitter.emit(
				"logging",
				`ERROR IN AXIOS HELPER - ${JSON.stringify(error)}`
			)
			throw error.response
				? error.response?.data || error.response
				: error
		}
	}
}

export default AxiosHelper
