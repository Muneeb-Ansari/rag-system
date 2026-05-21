import type { NextFunction, Request, Response } from "express";
import { productService } from "../services/product.service.js";

export async function createProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, description, image, price } = req.body;

    if (!name || !description || !image || !price) {
      res.status(400).json({ error: "Name, description, image, and price are required" });
      return;
    }

    const product = await productService.createProduct(name, description, image, price);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

export async function getProducts(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const products = await productService.getProducts();
    res.json(products);
  } catch (error) {
    next(error);
  }
}

export async function getProductById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id;
    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid product id" });
      return;
    }

    const product = await productService.getProductById(id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id;
    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid product id" });
      return;
    }
    const { name, description, image, price } = req.body;

    if (!name || !description || !image || !price) {
      res.status(400).json({ error: "Name, description, image, and price are required" });
      return;
    }

    const product = await productService.updateProduct(id, name, description, image, price);
    res.json(product);
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id;
    if (!id || Array.isArray(id)) {
      res.status(400).json({ error: "Invalid product id" });
      return;
    }
    const result = await productService.deleteProduct(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
