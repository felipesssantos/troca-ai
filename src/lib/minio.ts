import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const rawEndpoint = import.meta.env.VITE_MINIO_ENDPOINT
// Ensure protocol is present (AWS SDK and URL constructor require it)
const endpoint = rawEndpoint.startsWith('http') ? rawEndpoint : `http://${rawEndpoint}`
const accessKeyId = import.meta.env.VITE_MINIO_ACCESS_KEY
const secretAccessKey = import.meta.env.VITE_MINIO_SECRET_KEY

export const BUCKET_NAME = 'troca-ai-files'

export const s3Client = new S3Client({
    region: 'us-east-1', // MinIO doesn't care, but SDK needs it
    endpoint: endpoint,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
    forcePathStyle: true, // Crucial for MinIO
})

export const uploadFile = async (file: File, fileName: string) => {
    // Fix for "readableStream.getReader is not a function":
    // Convert File to ArrayBuffer to avoid any stream ambiguity in the browser
    const fileBuffer = await file.arrayBuffer()
    const fileData = new Uint8Array(fileBuffer)

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: fileData, // Passing Uint8Array instead of File/Blob
        ContentType: file.type,
        ACL: 'public-read',
    })

    try {
        await s3Client.send(command)

        // Construct Public URL
        // If endpoint has no port or standard ports, cleaner URL building:
        const url = `${endpoint}/${BUCKET_NAME}/${fileName}`
        return url
    } catch (err) {
        console.error('Upload Error', err)
        throw err
    }
}

export const deleteFileFromUrl = async (fileUrl: string) => {
    try {
        // Extract Key from URL
        // Expected format: http://endpoint/bucket-name/KEY
        // We split by bucket name to be safe
        const parts = fileUrl.split(`${BUCKET_NAME}/`)
        if (parts.length < 2) return // Not a file in our bucket or malformed URL

        const key = parts[1] // "avatars/..."

        console.log('Deleting old avatar:', key)

        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        })

        await s3Client.send(command)
    } catch (err) {
        console.error('Delete Error (Non-fatal)', err)
        // We don't throw here to avoid blocking the user flow if deletion fails
    }
}
