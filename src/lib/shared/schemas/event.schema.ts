// src/lib/shared/schemas/event.schema.ts
import { z } from 'zod';

const req = (msg: string) => ({
  error: (issue: { input: unknown }) => (issue.input === undefined ? msg : undefined),
});

const sectionSchema = z.object({
  name: z
    .string(req('Tên khu vực là bắt buộc'))
    .min(1, 'Tên khu vực không được trống')
    .max(50, 'Tên khu vực phải dưới 50 ký tự'),

  rows: z
    .number(req('Số hàng là bắt buộc'))
    .int('Số hàng phải là số nguyên')
    .min(1, 'Số hàng phải trong khoảng từ 1 đến 50')
    .max(50, 'Số hàng phải trong khoảng từ 1 đến 50'),

  cols: z
    .number(req('Số cột là bắt buộc'))
    .int('Số cột phải là số nguyên')
    .min(1, 'Số cột phải trong khoảng từ 1 đến 50')
    .max(50, 'Số cột phải trong khoảng từ 1 đến 50'),

  price: z.number(req('Giá là bắt buộc')).positive('Giá phải lớn hơn 0'),

  sort_order: z.number().int().min(0).default(0),
});

export const createEventSchema = z.object({
  title: z
    .string(req('Tên sự kiện là bắt buộc'))
    .min(5, 'Tên sự kiện tối thiểu 5 ký tự')
    .max(200, 'Tên sự kiện tối đa 200 ký tự'),

  description: z.string(req('Mô tả là bắt buộc')).min(1, 'Mô tả không được trống'),

  venue: z.string(req('Địa điểm là bắt buộc')).min(1, 'Địa điểm không được trống'),

  // event_date: z
  //   .string(req('Ngày sự kiện là bắt buộc'))
  //   .datetime({ offset: true })
  //   .refine((val) => new Date(val) > new Date(), {
  //     message: 'Ngày sự kiện phải trong tương lai',
  //   }),

  event_date: z
    .string(req('Ngày sự kiện là bắt buộc'))
    .pipe(z.iso.datetime({ offset: true }))
    .check(z.refine((val) => new Date(val) > new Date(), 'Ngày sự kiện phải trong tương lai')),

  banner_image_url: z.string().url('URL ảnh không hợp lệ').optional().or(z.literal('')),

  sections: z.array(sectionSchema).min(1, 'Phải có ít nhất 1 khu vực ghế'),
});

export const publishEventParamSchema = z.object({
  id: z.coerce
    .number({
      error: () => 'ID sự kiện không hợp lệ',
    })
    .int('ID phải là số nguyên')
    .positive('ID phải lớn hơn 0'),
});

export type PublishEventParam = z.infer<typeof publishEventParamSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
