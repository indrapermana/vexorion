# Cloudflare R2 Production Setup

This runbook configures Cloudflare R2 for private project documents and publicly delivered product images.

## Resulting resources

| Purpose | Bucket | Access |
|---|---|---|
| Project documents | `vexorionerp-documents` | Private; short-lived signed download URLs |
| Product images | `vexorionerp-product-images` | Public through `https://images.vexorionerp.com` |

The API accesses both buckets through the R2 S3-compatible endpoint. Browser uploads are mediated by the API; direct browser-to-R2 upload is not part of the current design.

## 1. Enable R2 and create buckets

1. Open the Cloudflare dashboard.
2. Go to **R2 Object Storage**.
3. Create `vexorionerp-documents`.
4. Create `vexorionerp-product-images`.
5. Choose the permitted jurisdiction/location policy before adding customer data.

Keep the document bucket private. Do not enable an `r2.dev` public URL for it.

## 2. Create the application API token

1. In R2, open **Manage R2 API Tokens**.
2. Create an **Account API token** named `VexorionERP application storage`.
3. Grant **Object Read & Write**.
4. Scope it only to `vexorionerp-documents` and `vexorionerp-product-images`.
5. Create the token and securely save:
   - Access Key ID.
   - Secret Access Key.

The secret access key is displayed once. Store it in a password manager and Google Secret Manager; never commit it.

## 3. Record the account endpoint

Find the Cloudflare Account ID in the dashboard. The S3 endpoint format is:

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

The Account ID and bucket names are identifiers, not credentials. The access-key ID and secret access key are credentials.

## 4. Configure the public product-image domain

The `vexorionerp.com` zone must be active in the same Cloudflare account.

1. Open `vexorionerp-product-images`.
2. Open **Settings**.
3. Under **Custom Domains**, select **Add**.
4. Enter `images.vexorionerp.com`.
5. Accept the DNS record Cloudflare proposes.
6. Wait until both the domain status and access status are **Active/Enabled**.

Do not configure the S3 endpoint as the public application URL. The persisted image URL must use the HTTPS custom domain.

## 5. Configure the API

Use these non-secret settings:

```text
Storage__Provider=R2
Storage__R2__AccountId=<cloudflare-account-id>
Storage__R2__DocumentBucketName=vexorionerp-documents
Storage__R2__ProductImageBucketName=vexorionerp-product-images
Storage__R2__ProductImagePublicBaseUrl=https://images.vexorionerp.com
Storage__R2__SignedUrlLifetimeMinutes=5
```

Store these secret settings in Google Secret Manager:

```text
Storage__R2__AccessKeyId
Storage__R2__SecretAccessKey
```

Map them to the Cloud Run service as described in the Cloud Run production guide. Do not put these values in `appsettings.json`, GitHub variables, or GitHub secrets.

## 6. Validate product images

Through the authenticated Main UI:

1. Create a disposable product.
2. Upload a valid product image.
3. Confirm the product shows the image through `https://images.vexorionerp.com/...`.
4. Confirm the stored object is under `vexorionerp-product-images`.
5. Delete the product.
6. Confirm its object is also deleted from R2.

Deleting a database record without deleting its R2 object is a failed test because it creates orphaned storage.

## 7. Validate project documents

Through the authenticated Main UI:

1. Create a disposable project.
2. Upload a harmless text or PDF document.
3. Preview/download it and confirm the bytes match the original.
4. Record the temporary signed URL.
5. Delete the document.
6. Confirm the API record returns 404.
7. Confirm the previous signed URL returns 404.
8. Upload another disposable document and delete the entire project.
9. Confirm the project cascade removes the related R2 object.

Also verify that an untouched signed URL expires after the configured five-minute lifetime.

R2 may display key prefixes as folders. These are object-name prefixes, not separately created directories. One upload creates one object even when the dashboard presents several nested prefix levels.

## 8. CORS guidance

The current application uploads through the backend and displays product images through a public custom domain. Do not add a broad R2 CORS policy preemptively. Add a least-privilege policy only if a future direct browser upload/download feature requires it, limiting origins, methods, headers, and expiry.

## 9. Credential rotation

1. Create a new bucket-scoped R2 token.
2. Add new versions to both Google Secret Manager secrets.
3. update Cloud Run to explicit new secret versions, creating a new revision.
4. Verify image and document upload/download/delete.
5. Revoke the old token.

Never revoke the old token before the new Cloud Run revision passes validation.

## Operational checklist

- [ ] Documents bucket is private.
- [ ] Product-image bucket uses the active custom domain.
- [ ] Token has Object Read & Write only on the two application buckets.
- [ ] R2 credentials exist only in Secret Manager/password manager.
- [ ] Product deletion removes its image.
- [ ] Document deletion removes its object.
- [ ] Project deletion removes related document objects.
- [ ] Signed URLs expire and become unusable after object deletion.

