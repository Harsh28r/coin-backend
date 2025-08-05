import express from 'express';
import { getPosts, createPost, updatePost, deletePost } from '../controllers/postController';

const postroutes = express.Router();

console.log('Posts routes loaded'); // Debugging log

// Define routes
Router.get('/', getPosts);
Router.post('/', createPost);
Router.put('/:id', updatePost);
Router.delete('/:id', deletePost);

export default postroutes;

