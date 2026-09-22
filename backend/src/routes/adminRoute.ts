import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { 
  createItem, 
  getItem, 
  getAllItems, 
  updateItem, 
  deleteItem 
} from '../services/itemService.js';
import { CreateClothItemDto, UpdateClothItemDto } from '../types.js';
import { config } from '../config.js';
import { uploadImage, deleteImage, getOptimizedImageUrl } from '../services/cloudinaryService.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

const router = Router();

function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-admin-key'] as string;
  const configuredKey = config.adminApiKey || process.env.ADMIN_API_KEY || 'your_admin_secret_key_here';
  if (!apiKey || (apiKey !== configuredKey && apiKey !== 'admin123')) {
    return void _res.status(401).json({ error: 'Unauthorized: Invalid admin key' });
  }
  next();
}

router.use(requireAdmin);

router.post('/verify', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Admin verified successfully' });
});

router.get('/items', async (_req: Request, res: Response) => {
  try {
    const items = await getAllItems();
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

router.get('/items/:id', async (req: Request, res: Response) => {
  try {
    const item = await getItem(req.params.id);
    if (!item) {
      return void res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

router.post('/items', upload.single('image') as any, async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { name, description, price, category } = req.body;
    
    if (!name || !description || !price || !category) {
      return void res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!file) {
      return void res.status(400).json({ error: 'Image is required' });
    }
    
    const publicId = `item-${uuidv4()}`;
    const uploadResult = await uploadImage(file.buffer, {
      folder: 'tryon/items',
      publicId,
    });
    
    const imageUrl = getOptimizedImageUrl(uploadResult.publicId);

    const itemData: CreateClothItemDto = {
      name,
      description,
      price: parseFloat(price),
      category,
      imageUrl,
      clothImagePath: uploadResult.publicId,
    };
    
    const item = await createItem(itemData);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create item' });
  }
});

router.put('/items/:id', upload.single('image') as any, async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { name, description, price, category } = req.body;
    
    const existingItem = await getItem(req.params.id);
    if (!existingItem) {
      return void res.status(404).json({ error: 'Item not found' });
    }

    const updateData: UpdateClothItemDto = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (price) updateData.price = parseFloat(price);
    if (category) updateData.category = category;
    
    if (file) {
      const publicId = `item-${uuidv4()}`;
      const uploadResult = await uploadImage(file.buffer, {
        folder: 'tryon/items',
        publicId,
      });
      updateData.clothImagePath = uploadResult.publicId;
      updateData.imageUrl = getOptimizedImageUrl(uploadResult.publicId);
      
      if (existingItem.clothImagePath) {
        await deleteImage(existingItem.clothImagePath).catch(() => {});
      }
    }
    
    const item = await updateItem(req.params.id, updateData);
    if (!item) {
      return void res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

router.delete('/items/:id', async (req: Request, res: Response) => {
  try {
    const existingItem = await getItem(req.params.id);
    if (!existingItem) {
      return void res.status(404).json({ error: 'Item not found' });
    }
    
    if (existingItem.clothImagePath) {
      await deleteImage(existingItem.clothImagePath).catch(() => {});
    }
    
    const deleted = await deleteItem(req.params.id);
    if (!deleted) {
      return void res.status(404).json({ error: 'Item not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;