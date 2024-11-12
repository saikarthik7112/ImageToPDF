public with sharing class FileUploadService {

    // Define a nested class called FileDescriptor to hold file information.
    public class FileDescriptor {
        @AuraEnabled
        public String Content { get; set; } // Content of the file in base64-encoded format.

        @AuraEnabled
        public String ContentType { get; set; } // MIME type of the file.

        @AuraEnabled
        public Id ContentDocumentId { get; set; } // Salesforce Content Document Id associated with the file.
    }

    @AuraEnabled
    // A method to save a chunk of a file or the entire file.
    public static Id saveTheChunkFile(Id parentId, String fileName, String base64Data, String contentType, String fileId) {
        // URL-decode the base64 data (if it's URL-encoded).
        base64Data = EncodingUtil.urlDecode(base64Data, 'UTF-8');
        if (String.isBlank(fileId)) {
            // If fileId is blank, save the file as a new ContentVersion.
            fileId = saveFiles(parentId, fileName, base64Data);
        } else {
            // If fileId is provided, append the chunk to an existing file.
            appendToFile(fileId, base64Data);
        }

        return Id.valueOf(fileId); // Return the Id of the ContentVersion (file) that was created or updated.
    }

    @AuraEnabled
    // A method to save a new file as a ContentVersion and link it to a record.
    public static Id saveFiles(Id recordId, String fileName, String base64Data) {
        // Create a new ContentVersion object to store the file.
        ContentVersion contentToInsert = new ContentVersion();
        contentToInsert.Title = fileName;
        contentToInsert.VersionData = EncodingUtil.base64Decode(base64Data);
        contentToInsert.PathOnClient = 'CustomPDF.pdf';
        contentToInsert.IsMajorVersion = false;
        insert contentToInsert; // Insert the ContentVersion to save the file.

        // Retrieve the ContentDocumentId associated with the newly created ContentVersion.
        contentToInsert = [
            SELECT Id, ContentDocumentId
            FROM ContentVersion
            WHERE Id = :contentToInsert.Id
        ];
        
        // Create a ContentDocumentLink to associate the file with a record.
        ContentDocumentLink cl = new ContentDocumentLink();
        cl.ContentDocumentId = contentToInsert.ContentDocumentId;
        cl.LinkedEntityId = recordId;
        cl.ShareType = 'V';
        cl.Visibility = 'AllUsers';
        insert cl; // Insert the ContentDocumentLink to link the file to the record.

        return contentToInsert.Id; // Return the Id of the newly created ContentVersion (file).
    }

    @AuraEnabled
    // A method to append data (chunk) to an existing file.
    public static void appendToFile(Id contentDocumentId, String base64Data) {
       // Retrieve the ContentVersion record for the existing file.
        ContentVersion versionData = [
            SELECT Id, VersionData, ContentDocumentId
            FROM ContentVersion
            WHERE Id = :contentDocumentId
        ];

        // Get the existing file's content data and append the new chunk.
        String existingBody = EncodingUtil.base64Encode(versionData.VersionData);
        versionData.VersionData = EncodingUtil.base64Decode(existingBody + base64Data);

        update versionData; // Update the ContentVersion to save the appended data.
    }

    @AuraEnabled
    // A method to retrieve file information for a list of ContentVersion Ids.
    public static List<FileDescriptor> getEntityRecordFiles(List<String> listIds) {
        List<FileDescriptor> files = new List<FileDescriptor>();
        
        if (listIds.size() == 0) {
            return files; // If the input list is empty, return an empty list of FileDescriptors.
        }
        
        // Query the ContentVersion records associated with the provided Ids.
        Map<Id, ContentVersion> versionsMap = new Map<Id, ContentVersion>([
            SELECT Id, VersionData, Title, ContentDocumentId, FileExtension
            FROM ContentVersion
            WHERE Id IN :listIds AND IsLatest = TRUE
            WITH SECURITY_ENFORCED
        ]);
        
        // Iterate through the queried ContentVersions and create FileDescriptor objects.
        for (String versionId : listIds) {
            ContentVersion cv = versionsMap.get(versionId);
            FileDescriptor data = new FileDescriptor();
            data.Content = EncodingUtil.base64Encode(cv.VersionData);
            data.ContentType = ContentType(cv.FileExtension); // Get MIME type based on file extension.
            data.ContentDocumentId = cv.ContentDocumentId;
            files.add(data); // Add the FileDescriptor to the list.
        }

        return files; // Return a list of FileDescriptors containing file information.
    }

    // A helper method to determine the MIME type based on file extension.
    public static String ContentType(String fileType) {
       switch on fileType.toLowerCase() {
			when 'csv' {
				return 'application/vnd.ms-excel';
			}
			when 'png' {
				return 'image/png';
			}
			when 'pdf' {
				return 'application/pdf';
			}
			when else {
				return 'image/jpeg'; // Default MIME type for unsupported file types.
			}
		}
	}
}