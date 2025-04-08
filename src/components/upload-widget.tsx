import * as Collapsible from "@radix-ui/react-collapsible";
import { UploadWidgetDropzone } from "./upload-widget-dropzone";
import { UploadWidgetHeader } from "./upload-widget-header";
import { UploadWidgetUploadList } from "./upload-widget-upload-list";
import { useState } from "react";
import { UploadWidgetMinimizeButton } from "./upload-widget-minimized-button";

export function UploadWidget() {

	const [isWidgetOpen, setWidgetOpen] = useState(false)

	return (
		<Collapsible.Root onOpenChange={setWidgetOpen}>
			<div className="bg-zinc-900  overflow-hidden w-[360px] rounded-xl shadow-shape">
				{!isWidgetOpen && <UploadWidgetMinimizeButton />}

				<Collapsible.Content>
					<UploadWidgetHeader />

					<div className="flex flex-col gap-4 py-3">
						<UploadWidgetDropzone />

						<div className="h-px bg-zinc-800 border-t border-t-black/50 box-content"></div>

						<UploadWidgetUploadList />
					</div>
				</Collapsible.Content>
			</div>
		</Collapsible.Root>
	)
}

