import Database from 'better-sqlite3'
import {GetObjectCommand, PutObjectCommand, S3Client} from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'

const s3 = new S3Client({
    region: 'ru-central1',
    endpoint: 'https://storage.yandexcloud.net',
    credentials: {
        accessKeyId: process.env.YC_ACCESS_KEY_ID!,
        secretAccessKey: process.env.YC_SECRET_ACCESS_KEY!,
    },
})

const bucket = 'kubik'
const key = 'dev.db'
const dbPath = path.join(process.cwd(), 'dev.db')

let dbDownloaded = false

async function ensureDbDownloaded() {
    if (dbDownloaded) return

    try {
        const command = new GetObjectCommand({Bucket: bucket, Key: key})
        const response = await s3.send(command)
        const stream = response.Body as fs.Readable
        const fileStream = fs.createWriteStream(dbPath)
        stream.pipe(fileStream)
        await new Promise<void>((resolve, reject) => {
            fileStream.on('finish', resolve)
            fileStream.on('error', reject)
        })
    } catch (error: any) {
        if (error.name === 'NoSuchKey') {
            // DB does not exist, create empty
            const db = new Database(dbPath)
            // Create tables if needed (you might want to initialize schema here)
            db.close()
        } else {
            throw error
        }
    }

    dbDownloaded = true
}

async function uploadDb() {
    const fileStream = fs.createReadStream(dbPath)
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileStream,
    })
    await s3.send(command)
}

export async function getDb() {
    await ensureDbDownloaded()
    return new Database(dbPath)
}

export async function closeDb(db: Database) {
    db.close()
    await uploadDb()
}