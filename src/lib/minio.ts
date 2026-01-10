import * as Minio from 'minio'

const endPoint = import.meta.env.VITE_MINIO_ENDPOINT.replace('http://', '').replace('https://', '').split(':')[0]
const port = parseInt(import.meta.env.VITE_MINIO_ENDPOINT.split(':')[2] || '900')
const useSSL = import.meta.env.VITE_MINIO_ENDPOINT.startsWith('https')

export const minioClient = new Minio.Client({
    endPoint: endPoint,
    port: port,
    useSSL: useSSL,
    accessKey: import.meta.env.VITE_MINIO_ACCESS_KEY,
    secretKey: import.meta.env.VITE_MINIO_SECRET_KEY,
})

export const BUCKET_NAME = 'troca-ai-avatars'
