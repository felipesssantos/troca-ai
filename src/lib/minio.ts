import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const endpoint = import.meta.env.VITE_MINIO_ENDPOINT
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
