import { useEffect, useMemo, useState } from 'react'
import { VxAlert, VxBox, VxButton, VxCircularProgress, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxFormControlLabel, VxStack, VxSwitch, VxTextField, VxTypography } from '@vexorion/ui'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useTranslation } from 'react-i18next'
import { ApiError, createProduct, getProduct, updateProduct } from '../../../lib/api'
import type { ValidationProblem } from '../../../types/api'
import type { ProductEditorDialogProps, ProductFormValues } from '../../../types/ui'

const defaultValues: ProductFormValues = {
	sku: '',
	name: '',
	description: '',
	unitOfMeasure: 'EA',
	standardCost: 0,
	salesPrice: 0,
	reorderLevel: 0,
	isActive: true,
}

const validationSchema: yup.ObjectSchema<ProductFormValues> = yup.object({
	sku: yup.string().trim().required('SKU is required.').max(50, 'SKU must be at most 50 characters.'),
	name: yup.string().trim().required('Name is required.').min(2, 'Name must be at least 2 characters.').max(200, 'Name must be at most 200 characters.'),
	description: yup.string().max(1000, 'Description must be at most 1000 characters.').defined(),
	unitOfMeasure: yup.string().trim().required('Unit of measure is required.').max(20, 'Unit of measure must be at most 20 characters.'),
	standardCost: yup.number().typeError('Standard cost must be a number.').min(0, 'Standard cost cannot be negative.').required('Standard cost is required.'),
	salesPrice: yup.number().typeError('Sales price must be a number.').min(0, 'Sales price cannot be negative.').required('Sales price is required.'),
	reorderLevel: yup.number().typeError('Reorder level must be a number.').min(0, 'Reorder level cannot be negative.').required('Reorder level is required.'),
	isActive: yup.boolean().required(),
})

function normalizeServerFieldName(fieldName: string): keyof ProductFormValues | null {
	const normalized = fieldName.charAt(0).toLowerCase() + fieldName.slice(1)
	if (normalized in defaultValues) {
		return normalized as keyof ProductFormValues
	}

	return null
}

export default function ProductEditorDialog({
	open,
	mode,
	productId,
	onClose,
	onSaved,
}: ProductEditorDialogProps) {
	const { t } = useTranslation()
	const [isLoadingProduct, setIsLoadingProduct] = useState(mode === 'edit' && Boolean(productId))
	const [submitError, setSubmitError] = useState<string | null>(null)

	const title = useMemo(
		() => (mode === 'create' ? t('components.products.editor.createTitle') : t('components.products.editor.editTitle')),
		[mode, t],
	)
	const {
		control,
		handleSubmit,
		reset,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<ProductFormValues>({
		defaultValues,
		resolver: yupResolver(validationSchema),
	})

	useEffect(() => {
		if (mode === 'create') {
			return
		}

		if (!productId) {
			return
		}

		let isMounted = true

		void getProduct(productId)
			.then((product) => {
				if (!isMounted) {
					return
				}

				reset({
					sku: product.sku,
					name: product.name,
					description: product.description ?? '',
					unitOfMeasure: product.unitOfMeasure,
					standardCost: product.standardCost,
					salesPrice: product.salesPrice,
					reorderLevel: product.reorderLevel,
					isActive: product.isActive,
				})
			})
			.catch((error: unknown) => {
				if (!isMounted) {
					return
				}

				if (error instanceof ApiError) {
					setSubmitError(error.message)
				} else {
					setSubmitError(t('components.products.editor.errors.load'))
				}
			})
			.finally(() => {
				if (isMounted) {
					setIsLoadingProduct(false)
				}
			})

		return () => {
			isMounted = false
		}
	}, [mode, productId, reset, t])

	const applyServerValidation = (validation?: ValidationProblem) => {
		if (!validation) {
			return
		}

		Object.entries(validation).forEach(([fieldName, fieldErrors]) => {
			const normalizedFieldName = normalizeServerFieldName(fieldName)
			if (normalizedFieldName && fieldErrors.length > 0) {
				setError(normalizedFieldName, { message: fieldErrors[0] })
			}
		})
	}

	const onSubmit = handleSubmit(async (values) => {
		setSubmitError(null)

		const payload = {
			sku: values.sku.trim(),
			name: values.name.trim(),
			description: values.description.trim() ? values.description.trim() : null,
			unitOfMeasure: values.unitOfMeasure.trim(),
			standardCost: values.standardCost,
			salesPrice: values.salesPrice,
			reorderLevel: values.reorderLevel,
		}

		try {
			const savedProduct =
				mode === 'create'
					? await createProduct(payload)
					: await updateProduct(productId!, { ...payload, isActive: values.isActive })

			onSaved(savedProduct, mode)
			reset(defaultValues)
		} catch (error) {
			if (error instanceof ApiError) {
				setSubmitError(error.message)
				applyServerValidation(error.validation)
			} else {
				setSubmitError(t('components.products.editor.errors.save'))
			}
		}
	})

	return (
		<VxDialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="md">
			<VxDialogTitle>{title}</VxDialogTitle>
			<VxDialogContent dividers>
				{isLoadingProduct ? (
					<VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
						<VxStack spacing={1.5} sx={{ alignItems: 'center' }}>
							<VxCircularProgress size={28} />
							<VxTypography color="text.secondary">{t('components.products.editor.loading')}</VxTypography>
						</VxStack>
					</VxBox>
				) : (
					<VxStack spacing={2.5} sx={{ pt: 1 }}>
						{submitError ? <VxAlert severity="error">{submitError}</VxAlert> : null}

						<VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
							<Controller
								name="sku"
								control={control}
								render={({ field }) => (
									<VxTextField
										{...field}
										fullWidth
										label={t('components.products.editor.fields.sku')}
										error={Boolean(errors.sku)}
										helperText={errors.sku?.message}
									/>
								)}
							/>
							<Controller
								name="unitOfMeasure"
								control={control}
								render={({ field }) => (
									<VxTextField
										{...field}
										fullWidth
										label={t('components.products.editor.fields.unitOfMeasure')}
										error={Boolean(errors.unitOfMeasure)}
										helperText={errors.unitOfMeasure?.message}
									/>
								)}
							/>
						</VxStack>

						<Controller
							name="name"
							control={control}
							render={({ field }) => (
								<VxTextField
									{...field}
									fullWidth
									label={t('components.products.editor.fields.name')}
									error={Boolean(errors.name)}
									helperText={errors.name?.message}
								/>
							)}
						/>

						<Controller
							name="description"
							control={control}
							render={({ field }) => (
								<VxTextField
									{...field}
									fullWidth
									multiline
									minRows={3}
									label={t('components.products.editor.fields.description')}
									error={Boolean(errors.description)}
									helperText={errors.description?.message ?? t('components.products.editor.optional')}
								/>
							)}
						/>

						<VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
							<Controller
								name="standardCost"
								control={control}
								render={({ field }) => (
									<VxTextField
										{...field}
										fullWidth
										label={t('components.products.editor.fields.standardCost')}
										type="number"
										slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
										error={Boolean(errors.standardCost)}
										helperText={errors.standardCost?.message}
										onChange={(event) => field.onChange(Number(event.target.value))}
									/>
								)}
							/>
							<Controller
								name="salesPrice"
								control={control}
								render={({ field }) => (
									<VxTextField
										{...field}
										fullWidth
										label={t('components.products.editor.fields.salesPrice')}
										type="number"
										slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
										error={Boolean(errors.salesPrice)}
										helperText={errors.salesPrice?.message}
										onChange={(event) => field.onChange(Number(event.target.value))}
									/>
								)}
							/>
							<Controller
								name="reorderLevel"
								control={control}
								render={({ field }) => (
									<VxTextField
										{...field}
										fullWidth
										label={t('components.products.editor.fields.reorderLevel')}
										type="number"
										slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
										error={Boolean(errors.reorderLevel)}
										helperText={errors.reorderLevel?.message}
										onChange={(event) => field.onChange(Number(event.target.value))}
									/>
								)}
							/>
						</VxStack>

						{mode === 'edit' ? (
							<Controller
								name="isActive"
								control={control}
								render={({ field }) => (
									<VxFormControlLabel
										control={<VxSwitch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
										label={field.value ? t('components.products.editor.active') : t('components.products.editor.inactive')}
									/>
								)}
							/>
						) : null}
					</VxStack>
				)}
			</VxDialogContent>
			<VxDialogActions sx={{ px: 3, py: 2 }}>
				<VxButton onClick={onClose} disabled={isSubmitting}>{t('dialogs.cancel')}</VxButton>
				<VxButton onClick={() => void onSubmit()} variant="contained" disabled={isSubmitting || isLoadingProduct}>
					{isSubmitting
						? t('components.products.editor.saving')
						: mode === 'create'
							? t('components.products.editor.createAction')
							: t('components.products.editor.saveAction')}
				</VxButton>
			</VxDialogActions>
		</VxDialog>
	)
}