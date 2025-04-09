import axios from "axios"

interface UploadFileToStorageProps {
	file: File
}
interface uploadFileToStorageOpts {
	signal?: AbortSignal
}

export async function uploadFileToStorage({ file }: UploadFileToStorageProps, opts?: uploadFileToStorageOpts) {
	const data = new FormData()

	data.append("file", file)

	const response = await axios.post("http://localhost:3333/uploads", data, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
		signal: opts?.signal,
	})
	return { url: response.data.url }
}