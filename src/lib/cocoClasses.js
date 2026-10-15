export const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
  'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
  'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier',
  'toothbrush',
]

/**
 * COCO classes grouped into human-friendly categories. Every entry in
 * COCO_CLASSES appears exactly once across these groups (see the sanity check
 * below), so the GUI can offer category-level select-all.
 */
export const COCO_CATEGORIES = [
  {
    name: 'People & vehicles',
    classes: ['person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat'],
  },
  {
    name: 'Street',
    classes: ['traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench'],
  },
  {
    name: 'Animals',
    classes: ['bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe'],
  },
  {
    name: 'Accessories',
    classes: ['backpack', 'umbrella', 'handbag', 'tie', 'suitcase'],
  },
  {
    name: 'Sports',
    classes: [
      'frisbee', 'skis', 'snowboard', 'sports ball', 'kite',
      'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
    ],
  },
  {
    name: 'Kitchen & dining',
    classes: [
      'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl',
      'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot',
      'hot dog', 'pizza', 'donut', 'cake',
    ],
  },
  {
    name: 'Furniture',
    classes: ['chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet'],
  },
  {
    name: 'Electronics',
    classes: ['tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone'],
  },
  {
    name: 'Appliances',
    classes: ['microwave', 'oven', 'toaster', 'sink', 'refrigerator'],
  },
  {
    name: 'Misc',
    classes: ['book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'],
  },
]

// Dev-time sanity check: categories must cover the class list exactly once.
if (import.meta.env?.DEV) {
  const grouped = COCO_CATEGORIES.flatMap((c) => c.classes)
  const missing = COCO_CLASSES.filter((c) => !grouped.includes(c))
  const unknown = grouped.filter((c) => !COCO_CLASSES.includes(c))
  const duplicates = grouped.filter((c, i) => grouped.indexOf(c) !== i)
  if (missing.length || unknown.length || duplicates.length) {
    console.error('[cocoClasses] category mismatch', { missing, unknown, duplicates })
  }
}
