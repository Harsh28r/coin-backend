import express from 'express';
import {
  getPosts,
  createPost,
  updatePost,
  deletePost
} from '../controllers/postController.js';
import Post from '../models/Post.js';

const router = express.Router();

// Fetch all posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find(); // Fetch posts from MongoDB
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.route('/').get(getPosts).post(createPost);
router.route('/:id').put(updatePost).delete(deletePost);

export default router;