import { LightningElement, api, track } from "lwc";
import saveTheChunkFile from "@salesforce/apex/FileUploadService.saveTheChunkFile";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import PDF_LIB from "@salesforce/resourceUrl/pdflib";
import { loadScript } from "lightning/platformResourceLoader";

const MAX_FILE_SIZE = 5000000; // 5 MB
const CHUNK_SIZE = 2500000; // 2.5 MB

export default class ConvertImagetoPDF extends LightningElement {
    @api recordId;
    @track fileName = "";
    @track selectedFiles = [];
    @track previewImages = [];
    isLoading = false;
    pdfLibLoaded = false;

    get spinnerClass() {
        return this.isLoading ? "spinner-container visible" : "spinner-container hidden";
    }

    renderedCallback() {
        if (this.pdfLibLoaded) {
            return;
        }
        loadScript(this, PDF_LIB).then(() => {
            this.pdfLibLoaded = true;
        });
    }

    handleFileNameChange(event) {
        this.fileName = event.target.value;
    }

    handleFilesChange(event) {
        if (event.target.files) {
            const newFiles = Array.from(event.target.files);

            newFiles.forEach((file) => {
                if (this.validateFile(file)) {
                    this.selectedFiles.push(file);
                    const imageUrl = URL.createObjectURL(file);
                    this.previewImages.push({ name: file.name, url: imageUrl });
                }
            });

            if (!this.fileName && this.selectedFiles.length > 0) {
                this.fileName = this.selectedFiles[0].name;
            }
        }
    }

    validateFile(file) {
        const validTypes = ["image/png", "image/jpeg", "image/webp"];
        if (!validTypes.includes(file.type)) {
            this.showToast("Error", `Unsupported file type: ${file.type}`, "error");
            return false;
        }
        return true;
    }

    handleCancelFile(event) {
        const fileIndex = event.currentTarget.dataset.index;
        const imageUrl = this.previewImages[fileIndex].url;

        URL.revokeObjectURL(imageUrl);
        this.selectedFiles.splice(fileIndex, 1);
        this.previewImages.splice(fileIndex, 1);

        if (this.selectedFiles.length === 0) {
            this.fileName = "";
        }

        this.selectedFiles = [...this.selectedFiles];
        this.previewImages = [...this.previewImages];
    }

    handleUpload() {
        if (this.selectedFiles.length === 0) {
            this.showToast("Error", "Please select files to upload", "error");
            return;
        }
        this.isLoading = true;
        this.processFilesToConvert(this.selectedFiles);
    }

    async processFilesToConvert(files) {
        try {
            const pdfDoc = await PDFLib.PDFDocument.create();
            const imageProcessingPromises = files.map(file => this.processSingleFile(file, pdfDoc));
            
            // Batch process images
            await Promise.all(imageProcessingPromises);
            const pdfBytes = await pdfDoc.save();
            this.prepareFileToUpload(pdfBytes);
        } catch (error) {
            console.error("Error: ", error);
            this.showToast("Error", error.message || "Error processing the files", "error");
            this.isLoading = false;
        }
    }

    async processSingleFile(file, pdfDoc) {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File ${file.name} exceeds the max size of ${MAX_FILE_SIZE} bytes.`);
      }

      const compressedImage = await this.compressImage(file);
      await this.embedImageFileToPDF(pdfDoc, compressedImage);
    }

    async embedImageFileToPDF(pdfDoc, file) {
        const base64Data = await this.readFileAsBase64(file);

        let image;
        if (file.type === "image/png") {
            image = await pdfDoc.embedPng(base64Data);
        } else if (file.type === "image/jpeg") {
            image = await pdfDoc.embedJpg(base64Data);
        } else if (file.type === "image/webp") {
            const webpToPngData = await this.convertWebpToPng(base64Data);
            image = await pdfDoc.embedPng(webpToPngData);
        }

        const pageWidth = image.width;
        const pageHeight = image.height;
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        const scale = Math.min(pageWidth / image.width, pageHeight / image.height, 1);

        page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width * scale,
            height: image.height * scale,
        });
    }

    async readFileAsBase64(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result.split(",")[1]);
            reader.readAsDataURL(file);
        });
    }

    async compressImage(file, maxWidth = 1000, maxHeight = 1000) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);

            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: file.type }));
                }, file.type, 0.5); // Reduce quality to 50% for faster processing
            };
        });
    }

    async convertWebpToPng(webpBase64) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/png").split(",")[1]);
            };
            img.src = "data:image/webp;base64," + webpBase64;
        });
    }

    prepareFileToUpload(pdfBytes) {
        const blob = new Blob([pdfBytes], { type: "application/pdf" });

        if (blob.size > MAX_FILE_SIZE) {
            this.showToast("Error", `File size cannot exceed ${MAX_FILE_SIZE} bytes. Selected file size: ${blob.size}`, "error");
            this.isLoading = false;
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const fileContents = reader.result.split(",")[1];
            this.upload(blob, fileContents);
        };
        reader.readAsDataURL(blob);
    }

    upload(file, fileContents) {
        this.uploadChunk(file, fileContents, 0, CHUNK_SIZE, "");
    }

    uploadChunk(file, fileContents, fromPos, toPos, attachId) {
        const chunk = fileContents.substring(fromPos, toPos);
        const fileName = file.name;

        saveTheChunkFile({
            parentId: this.recordId,
            fileName: this.fileName,
            base64Data: encodeURIComponent(chunk),
            contentType: file.type,
            fileId: attachId,
        })
            .then((result) => {
                attachId = result;
                fromPos = toPos;
                toPos = Math.min(fileContents.length, fromPos + CHUNK_SIZE);

                if (fromPos < toPos) {
                    this.uploadChunk(file, fileContents, fromPos, toPos, attachId);
                } else {
                    this.showToast("Success", `File was successfully uploaded.`, "success");
                    this.isLoading = false;
                    this.selectedFiles = [];
                    this.previewImages = [];
                    this.fileName = "";
                }
            })
            .catch((error) => {
                console.error("Upload error: ", error);
                this.showToast("Error", error.message || "Error uploading file", "error");
                this.isLoading = false;
            });
    }

    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(evt);
    }
}
