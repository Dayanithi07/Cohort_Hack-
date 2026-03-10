"use client";

import { useState, useEffect, useCallback, FormEvent, ChangeEvent } from "react";
import styles from "../../dashboard.module.css";

type UserProduct = {
  id: number;
  business_id: number;
  name: string;
  sku?: string | null;
  base_price?: number | null;
  current_price?: number | null;
  image_url?: string | null;
  url?: string | null;
  description?: string | null;
  category?: string | null;
  created_at: string;
  updated_at: string;
};

type ProductCatalogProps = {
  businessId: number;
  authFetch: (url: string, opts?: RequestInit) => Promise<Response | null>;
};

const INITIAL_PRODUCT = {
  name: "",
  sku: "",
  base_price: "",
  current_price: "",
  url: "",
  image_url: "",
  description: "",
  category: "",
};

export default function ProductCatalog({ businessId, authFetch }: ProductCatalogProps) {
  const [products, setProducts] = useState<UserProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<UserProduct | null>(null);
  const [formData, setFormData] = useState(INITIAL_PRODUCT);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await authFetch(`/api/v1/products/?business_id=${businessId}`);
      if (!response || !response.ok) {
        throw new Error("Failed to load products");
      }

      const data = (await response.json()) as UserProduct[];
      setProducts(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [businessId, authFetch]);

  useEffect(() => {
    if (businessId) {
      loadProducts();
    }
  }, [businessId, loadProducts]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const productData = {
        business_id: businessId,
        name: formData.name,
        sku: formData.sku || null,
        base_price: formData.base_price ? parseFloat(formData.base_price) : null,
        current_price: formData.current_price ? parseFloat(formData.current_price) : null,
        url: formData.url || null,
        image_url: formData.image_url || null,
        description: formData.description || null,
        category: formData.category || null,
      };

      let response;
      if (editingProduct) {
        response = await authFetch(`/api/v1/products/${editingProduct.id}`, {
          method: "PUT",
          body: JSON.stringify(productData),
        });
      } else {
        response = await authFetch("/api/v1/products/", {
          method: "POST",
          body: JSON.stringify(productData),
        });
      }

      if (!response || !response.ok) {
        const errorData = await response?.json();
        throw new Error(errorData?.detail || "Failed to save product");
      }

      setSuccess(editingProduct ? "Product updated successfully" : "Product created successfully");
      setFormData(INITIAL_PRODUCT);
      setShowAddForm(false);
      setEditingProduct(null);
      await loadProducts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: number) => {
    if (!confirm("Are you sure you want to delete this product?")) {
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await authFetch(`/api/v1/products/${productId}`, {
        method: "DELETE",
      });

      if (!response || !response.ok) {
        throw new Error("Failed to delete product");
      }

      setSuccess("Product deleted successfully");
      await loadProducts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: UserProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || "",
      base_price: product.base_price?.toString() || "",
      current_price: product.current_price?.toString() || "",
      url: product.url || "",
      image_url: product.image_url || "",
      description: product.description || "",
      category: product.category || "",
    });
    setShowAddForm(true);
  };

  const handleCsvUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!csvFile) {
      setError("Please select a CSV file");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);
    setUploadProgress("Uploading...");

    try {
      const formDataObj = new FormData();
      formDataObj.append("file", csvFile);

      const response = await authFetch(
        `/api/v1/products/bulk-upload?business_id=${businessId}`,
        {
          method: "POST",
          body: formDataObj,
        }
      );

      if (!response || !response.ok) {
        throw new Error("Failed to upload CSV");
      }

      const result = await response.json();
      setSuccess(
        `Upload complete: ${result.created} created, ${result.failed} failed${
          result.errors.length > 0 ? `. Errors: ${result.errors.join(", ")}` : ""
        }`
      );
      setCsvFile(null);
      setUploadProgress("");
      await loadProducts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload CSV");
      setUploadProgress("");
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setFormData(INITIAL_PRODUCT);
    setShowAddForm(false);
  };

  return (
    <div className={styles.productCatalog}>
      <div className={styles.rowBetween}>
        <div>
          <h3>Product Catalog</h3>
          <p className={styles.mutedSmall}>
            Manage your products for intelligent competitor matching
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? "Cancel" : "+ Add Product"}
          </button>
        </div>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}
      {success ? <div className={styles.successBox}>{success}</div> : null}

      {showAddForm ? (
        <div className={styles.sectionCard}>
          <h4>{editingProduct ? "Edit Product" : "Add New Product"}</h4>
          <form className={styles.formGrid} onSubmit={handleSubmit}>
            <label>
              Product Name *
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </label>
            <label>
              SKU
              <input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Unique identifier"
              />
            </label>
            <label>
              Base Price
              <input
                type="number"
                step="0.01"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
              />
            </label>
            <label>
              Current Price
              <input
                type="number"
                step="0.01"
                value={formData.current_price}
                onChange={(e) => setFormData({ ...formData, current_price: e.target.value })}
              />
            </label>
            <label>
              Product URL
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
              />
            </label>
            <label>
              Image URL
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
              />
            </label>
            <label>
              Category
              <input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </label>
            <label className={styles.fullRow}>
              Description
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </label>
            <div className={styles.fullRow}>
              <div className={styles.wizardActions}>
                <button type="button" className={styles.secondaryBtn} onClick={cancelEdit}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                  {editingProduct ? "Update Product" : "Add Product"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      <div className={styles.sectionCard}>
        <div className={styles.rowBetween}>
          <h4>Bulk Import</h4>
        </div>
        <form onSubmit={handleCsvUpload} className={styles.formGrid}>
          <label className={styles.fullRow}>
            Upload CSV File
            <input
              type="file"
              accept=".csv"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setCsvFile(e.target.files?.[0] || null)
              }
            />
            <small className={styles.mutedSmall}>
              Format: sku,name,base_price,current_price,url,image_url,description,category
            </small>
          </label>
          <button
            type="submit"
            className={styles.primaryBtn}
            disabled={!csvFile || loading}
          >
            {uploadProgress || "Upload CSV"}
          </button>
        </form>
      </div>

      <div className={styles.sectionCard}>
        <h4>Your Products ({products.length})</h4>
        {loading && products.length === 0 ? (
          <p className={styles.muted}>Loading products...</p>
        ) : products.length === 0 ? (
          <p className={styles.muted}>No products yet. Add your first product above.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.competitorTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Base Price</th>
                  <th>Current Price</th>
                  <th>Category</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className={styles.productCell}>
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className={styles.productThumb}
                          />
                        ) : null}
                        <span>{product.name}</span>
                      </div>
                    </td>
                    <td>{product.sku || "-"}</td>
                    <td>${product.base_price?.toFixed(2) || "-"}</td>
                    <td>${product.current_price?.toFixed(2) || "-"}</td>
                    <td>{product.category || "-"}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={() => handleEdit(product)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={() => handleDelete(product.id)}
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
