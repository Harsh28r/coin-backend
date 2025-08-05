
import express from 'express';
import { getPosts, createPost, updatePost, deletePost } from '../controllers/postController.js';

const router = express.Router(); // Initialize router

console.log('Post routes loaded');

// Define routes
router.get('/', getPosts);
router.post('/', createPost);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);

export default router;