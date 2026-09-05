import { Response, NextFunction } from 'express'
import fs from 'fs'
import path from 'path'
import { IArtworkRepository } from '../../domain/repositories'
import { AuthRequest } from '../middlewares'
import { prisma } from '../../infrastructure/database/prismaClient'

export class ArtworkController {
  constructor(private artworkRepo: IArtworkRepository) {}

  // GET /api/artworks
  getAll = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const artworks = await this.artworkRepo.findAll()
      res.json(artworks)
    } catch (err) {
      next(err)
    }
  }

  // GET /api/artworks/:id
  getById = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params
      const artwork = await this.artworkRepo.findById(id)
      if (!artwork) {
        res.status(404).json({ error: 'Eser bulunamadı' })
        return
      }
      res.json(artwork)
    } catch (err) {
      next(err)
    }
  }

  // POST /api/artworks
  create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Eser kaydetmek için giriş yapmanız gerekiyor' })
        return
      }

      const { storyId, image } = req.body

      if (!storyId || !image) {
        res.status(400).json({ error: 'Masal kimliği ve görsel verisi gereklidir' })
        return
      }

      // Base64 görsel verisini kontrol et ve temizle
      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
      if (!matches || matches.length !== 3) {
        res.status(400).json({ error: 'Geçersiz görsel verisi' })
        return
      }

      const imageBuffer = Buffer.from(matches[2], 'base64')

      // uploads/artworks klasörünün varlığını kontrol et
      const artworksDir = path.resolve(process.env.STORAGE_LOCAL_PATH ?? './uploads', 'artworks')
      if (!fs.existsSync(artworksDir)) {
        fs.mkdirSync(artworksDir, { recursive: true })
      }

      // Dosya adını oluştur
      const filename = `artwork_${req.userId}_${storyId}_${Date.now()}.png`
      const filePath = path.join(artworksDir, filename)

      // Dosyayı diske yaz
      fs.writeFileSync(filePath, imageBuffer)

      // Veritabanı için göreli url
      const imageUrl = `/uploads/artworks/${filename}`

      // Kullanıcının bu hikayeye ait daha önce kaydettiği bir boyama var mı kontrol et
      const existing = await this.artworkRepo.findByStoryAndUser(storyId, req.userId)

      let artwork
      if (existing) {
        // Eski görsel dosyasını diskten sil
        if (existing.imageUrl) {
          const oldFilename = path.basename(existing.imageUrl)
          const oldFilePath = path.join(artworksDir, oldFilename)
          if (fs.existsSync(oldFilePath)) {
            try {
              fs.unlinkSync(oldFilePath)
            } catch (err) {
              console.error('Eski görsel silinirken hata oluştu:', err)
            }
          }
        }

        // Güncelle
        artwork = await this.artworkRepo.update(existing.id, { imageUrl })
      } else {
        // Yeni oluştur
        artwork = await this.artworkRepo.create({
          userId: req.userId,
          storyId,
          imageUrl,
        })
      }

      res.status(201).json(artwork)
    } catch (err) {
      next(err)
    }
  }

  // DELETE /api/artworks/:id
  delete = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Giriş yapmanız gerekiyor' })
        return
      }

      const { id } = req.params
      const artwork = await this.artworkRepo.findById(id)
      if (!artwork) {
        res.status(404).json({ error: 'Eser bulunamadı' })
        return
      }

      const user = await prisma.user.findUnique({ where: { id: req.userId } })
      const isOwner = artwork.userId === req.userId
      const isAdmin = user?.role === 'ADMIN'

      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: 'Bu eseri silme yetkiniz yok' })
        return
      }

      // Diskten görseli sil
      if (artwork.imageUrl) {
        const filename = path.basename(artwork.imageUrl)
        const artworksDir = path.resolve(process.env.STORAGE_LOCAL_PATH ?? './uploads', 'artworks')
        const filePath = path.join(artworksDir, filename)
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath)
          } catch (err) {
            console.error('Görsel silinirken hata oluştu:', err)
          }
        }
      }

      // Veritabanından sil
      await this.artworkRepo.delete(id)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  }

  // POST /api/artworks/:id/react
  react = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'İfade bırakmak için giriş yapmanız gerekiyor' })
        return
      }

      const { id } = req.params
      const { type } = req.body

      const validTypes = ['LIKE', 'HEART', 'STAR', 'CLAP']
      if (!type || !validTypes.includes(type)) {
        res.status(400).json({ error: 'Geçersiz ifade tipi. Şunlar olabilir: LIKE, HEART, STAR, CLAP' })
        return
      }

      const artwork = await this.artworkRepo.findById(id)
      if (!artwork) {
        res.status(404).json({ error: 'Eser bulunamadı' })
        return
      }

      const result = await this.artworkRepo.toggleReaction(id, req.userId, type)
      res.json(result)
    } catch (err) {
      next(err)
    }
  }
}
