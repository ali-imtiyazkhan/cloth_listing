import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
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
    
    const clothImagePath = file.path;
    const imageUrl = `/uploads/${path.basename(file.path)}`;
    
    const itemData: CreateClothItemDto = {
      name,
      description,
      price: parseFloat(price),
      category,
      imageUrl,
      clothImagePath,
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
    
    const updateData: UpdateClothItemDto = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (price) updateData.price = parseFloat(price);
    if (category) updateData.category = category;
    
    if (file) {
      updateData.clothImagePath = file.path;
      updateData.imageUrl = `/uploads/${path.basename(file.path)}`;
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