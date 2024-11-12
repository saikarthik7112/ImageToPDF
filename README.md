# ImageToPDF - LWC Component

**ImageToPDF** is a Lightning Web Component (LWC) for Salesforce that converts selected images into a single PDF document, which is then stored in the related files of a Salesforce record. This component allows users to choose multiple images, reorder them, and name the PDF before uploading it to the associated record.

## Table of Contents
- Features
- Installation
- Usage
- Component Structure
- Technical Details
- Screenshot

## Features
- Multiple Image Selection: Allows users to upload multiple images to be converted to PDF.
- Image Reordering: Drag-and-drop functionality to arrange images before PDF generation.
- PDF Naming: Users can set a custom name for the PDF; if left blank, the name of the first image is used.
- Chunked File Upload: Leverages an Apex controller to upload large PDF files to Salesforce in chunks, ensuring efficient handling of file limits and preventing session timeouts.

## Installation

1. Clone the Repository:
```
git clone https://github.com/saikarthik7112/ImageToPDF.git
cd ImageToPDF
```

2. Deploy to Salesforce:
```
sfdx force:source:deploy -p force-app
```
3. Add Required Static Resource:

Don’t forget to upload any necessary files (e.g., libraries or icons) as static resources in Salesforce. Ensure they are referenced correctly in the component to avoid missing dependencies.

4. Add the Component to a Page:
- Open App Builder in your Salesforce org.
- Drag the ImageToPDF component onto the page where you want users to access it.

## Usage

1. Upload Images: Open the component and use the file selection option to upload images.
2. Arrange Images (Optional): Reorder images using the drag-and-drop interface.
3. Set PDF Name (Optional): Enter a custom name for the PDF file. If no name is provided, the name of the first image will be used.
4. Convert and Upload: Click the Convert to PDF button to generate the PDF and upload it to Salesforce as a related file.

## Component Structure

- HTML: Defines the UI layout for file upload, reordering, and PDF naming.
- JavaScript: Manages client-side logic for handling image selection, ordering, and interfacing with the Apex controller for file upload.
- CSS: Provides styling for a user-friendly, responsive interface.
- Apex Controller: Handles the server-side logic for processing large file uploads. The PDF is split and uploaded in chunks to bypass Salesforce’s file size limits and improve upload performance.

## Technical Details

- Chunked Upload: The component uses the Apex controller to divide the PDF into chunks, uploading each chunk individually to avoid hitting file size limits and session timeouts.
- File Naming: The component allows users to specify a file name for the PDF. If no name is provided, the first image file’s name is automatically assigned to the PDF.
- Related Files: The generated PDF is saved as a related file on the specified Salesforce record, making it accessible within Salesforce Files.

## Screenshot

![Screenshot 2024-11-12 212556](https://github.com/user-attachments/assets/cf2f0034-923a-4c51-ae57-4b97e944769d)
