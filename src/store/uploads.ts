import { create } from "zustand";
import { enableMapSet } from "immer"
import { immer } from "zustand/middleware/immer"
import { uploadFileToStorage } from "../http/upload-file-to-storage";
import { CanceledError } from "axios";
import { useShallow } from "zustand/shallow";
import { compressImage } from "../utils/compress-image";

export type Upload = {
	name: string
	file: File
	abortController?: AbortController
	status: 'progress' | 'success' | "error" | "canceled"
	originalSizeInBytes: number
	compressedSizeBytes?: number
	uploadSizeInBytes: number
	remoteUrl?: string
}

type UploadState = {
	uploads: Map<string, Upload>
	addUploads: (files: File[]) => void
	retryUpload: (uploadId: string) => void
	cancelUpload: (uploadId: string) => void
}

enableMapSet()

export const useUploads = create<UploadState, [['zustand/immer', never]]>(
	immer((set, get) => {
		function updatedUpload(uploadId: string, data: Partial<Upload>) {
			const upload = get().uploads.get(uploadId)

			if (!upload) {
				return
			}

			set(state => {
				state.uploads.set(uploadId, {
					...upload,
					...data
				})
			})

		}

		async function processUpload(uploadId: string) {
			const upload = get().uploads.get(uploadId)

			if (!upload) {
				return
			}
			const abortController = new AbortController()

			updatedUpload(uploadId, {
				uploadSizeInBytes: 0,
				remoteUrl: undefined,
				abortController,
				compressedSizeBytes: undefined,
				status: "progress"
			})

			try {
				const compressFile = await compressImage({
					file: upload.file,
					maxHeight: 1000,
					maxWidth: 1000,
					quality: 0.8
				});

				updatedUpload(uploadId, { compressedSizeBytes: compressFile.size })

				const { url } = await uploadFileToStorage(
					{
						file: compressFile,
						onProgress(sizeInBytes) {
							updatedUpload(uploadId, { uploadSizeInBytes: sizeInBytes })
						}
					},
					{ signal: abortController.signal }
				)

				updatedUpload(uploadId, { status: "success", remoteUrl: url })

			} catch (err) {
				if (err instanceof CanceledError) {
					updatedUpload(uploadId, { status: "canceled" })

					return
				}
				updatedUpload(uploadId, { status: "error" })
			}
		}

		async function cancelUpload(uploadId: string) {
			const upload = get().uploads.get(uploadId)

			if (!upload) {
				return
			}

			upload.abortController?.abort()
		}

		function retryUpload(uploadId: string) {
			processUpload(uploadId)
		}

		function addUploads(files: File[]) {
			for (const file of files) {
				const uploadId = crypto.randomUUID()

				const upload: Upload = {
					name: file.name,
					file,
					status: "progress",
					originalSizeInBytes: file.size,
					uploadSizeInBytes: 0,
				}

				set(state => {
					state.uploads.set(uploadId, upload)
				})

				processUpload(uploadId)
			}
		}

		return {
			uploads: new Map(),
			addUploads,
			retryUpload,
			cancelUpload
		}
	}))

export const usePendingUploads = () => {
	return useUploads(useShallow(store => {
		const isThereAnyPendingUploads = Array.from(store.uploads.values())
			.some(upload => upload.status === "progress")

		if (!isThereAnyPendingUploads) {
			return { isThereAnyPendingUploads, globalPercentage: 100 }
		}

		const {
			total,
			uploaded
		} = Array.from(store.uploads.values()).reduce(
			(acc, upload) => {

				if (upload.compressedSizeBytes) {
					acc.uploaded += upload.uploadSizeInBytes
				}

				acc.total += upload.compressedSizeBytes || upload.originalSizeInBytes

				return acc
			},
			{
				total: 0, uploaded: 0
			}
		)
		const globalPercentage = Math.min(
			Math.round((uploaded * 100) / total),
			100
		)

		return {
			isThereAnyPendingUploads,
			globalPercentage
		}
	}))
}