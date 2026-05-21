"use client";

import { useState, useEffect } from "react";
import { fetchProducts, createProduct, updateProduct, deleteProduct, Product } from "@/lib/api";
import Link from "next/dist/client/link";

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [productImage, setProductImage] = useState("");
    const [price, setPrice] = useState<number | "">("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load products on mount
    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchProducts();
            setProducts(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    // CREATE
    const handleAdd = async () => {
        if (!name || !description || !price) {
            setError("Please fill in all fields");
            return;
        }

        try {
            setError(null);
            const newProduct = await createProduct(name, description, productImage, String(price));
            setProducts([...products, newProduct]);
            setName("");
            setDescription("");
            setPrice("");
            setProductImage("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add product");
        }
    };

    // DELETE
    const handleDelete = async (id: string) => {
        try {
            setError(null);
            await deleteProduct(id);
            setProducts(products.filter((p) => p.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete product");
        }
    };

    // EDIT
    const handleEdit = (product: Product) => {
        setEditingId(product.id);
        setName(product.name);
        setDescription(product.description);
        setProductImage(product.image);
        setPrice(Number(product.price));
    };

    // UPDATE
    const handleUpdate = async () => {
        if (editingId === null) return;
        if (!name || !price) {
            setError("Please fill in all fields");
            return;
        }

        try {
            setError(null);
            const updated = await updateProduct(editingId, name, description, productImage, String(price));
            setProducts(
                products.map((p) => (p.id === editingId ? updated : p))
            );
            setEditingId(null);
            setName("");
            setDescription("");
            setPrice("");
            setProductImage("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update product");
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-5xl px-4 py-10">

                <div className="mb-8 max-w-3xl">
                    <p className="text-sm font-semibold text-muted-foreground">Product management</p>
                    <div className="flex justify-between items-center">
                        <h1 className="mt-2 text-3xl font-semibold text-foreground">Products CRUD</h1>
                        <Link href="/">
                            <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 mt-4">
                                Back to chat
                            </button>
                        </Link>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        Products are grouped by category so related items can be managed together. Use this page to add, edit, and remove products while keeping product information consistent with the app theme.
                    </p>
                </div>


                {error && (
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-6">
                        {error}
                    </div>
                )}

                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm mb-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex-1 min-w-0 space-y-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground" htmlFor="product-name">
                                    Product name
                                </label>
                                <input
                                    id="product-name"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/50"
                                    placeholder="Product name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground" htmlFor="product-description">
                                    Description
                                </label>
                                <input
                                    id="product-description"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/50"
                                    placeholder="Product description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground" htmlFor="product-image">
                                    Image URL
                                </label>
                                <input
                                    id="product-image"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/50"
                                    placeholder="Product image URL"
                                    value={productImage}
                                    onChange={(e) => setProductImage(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2 sm:max-w-[180px]">
                                <label className="text-sm font-medium text-foreground" htmlFor="product-price">
                                    Price
                                </label>
                                <input
                                    id="product-price"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/50"
                                    placeholder="Price"
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            {editingId ? (
                                <>
                                    <button
                                        onClick={handleUpdate}
                                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                        disabled={loading}
                                    >
                                        Update
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingId(null);
                                            setName("");
                                            setDescription("");
                                            setPrice("");
                                        }}
                                        className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleAdd}
                                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={loading}
                                >
                                    Add
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
                    <div className="border-b border-border/70 bg-background/80 px-6 py-4">
                        <h2 className="text-lg font-semibold text-foreground">Product list</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            View your current products and update them as needed.
                        </p>
                    </div>

                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-background text-left text-sm font-medium text-muted-foreground">
                                <th className="border-b border-border/70 px-6 py-3">Name</th>
                                <th className="border-b border-border/70 px-6 py-3">Description</th>
                                <th className="border-b border-border/70 px-6 py-3">Image</th>
                                <th className="border-b border-border/70 px-6 py-3">Price</th>
                                <th className="border-b border-border/70 px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && products.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
                                        Loading products...
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
                                        No products added
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => (
                                    <tr key={product.id} className="border-t border-border/70">
                                        <td className="px-6 py-4 text-sm text-foreground">{product.name}</td>
                                        <td className="px-6 py-4 text-sm text-foreground">{product.description}</td>
                                        <td className="px-6 py-4 text-sm text-foreground">
                                            <img src={product.image} alt={product.name} className="h-16 w-16 object-cover" />
                                        </td>
                                        <td className="px-6 py-4 text-sm text-foreground">${Number(product.price).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-sm text-foreground">
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="inline-flex items-center justify-center rounded-md bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                                    disabled={loading}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="inline-flex items-center justify-center rounded-md bg-destructive px-3 py-1 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
                                                    disabled={loading}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
