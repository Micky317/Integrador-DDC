import os
import json
import shutil

BASE_DIR = '/home/angel/Documentos/Universidad/integrador/MTDDH/Dataset1/Keypoints'
YOLO_DIR = '/home/angel/Documentos/Universidad/integrador/MTDDH/yolo_dataset'

def setup_dirs():
    for split in ['train', 'val']:
        os.makedirs(os.path.join(YOLO_DIR, 'images', split), exist_ok=True)
        os.makedirs(os.path.join(YOLO_DIR, 'labels', split), exist_ok=True)

def process_split(json_name, split_img_dir, target_split):
    json_path = os.path.join(BASE_DIR, json_name)
    if not os.path.exists(json_path):
        print(f"File not found: {json_path}")
        return
        
    with open(json_path, 'r') as f:
        data = json.load(f)
        
    img_dict = {}
    for img in data['images']:
        img_dict[img['id']] = img
        # copy image
        src_img = os.path.join(BASE_DIR, split_img_dir, img['file_name'].split('/')[-1])
        dst_img = os.path.join(YOLO_DIR, 'images', target_split, img['file_name'].split('/')[-1])
        if os.path.exists(src_img):
            shutil.copy(src_img, dst_img)
            
    ann_by_img = {}
    for ann in data['annotations']:
        img_id = ann['image_id']
        if img_id not in ann_by_img:
            ann_by_img[img_id] = []
        ann_by_img[img_id].append(ann)
        
    for img_id, anns in ann_by_img.items():
        img_info = img_dict[img_id]
        img_w, img_h = img_info['width'], img_info['height']
        
        file_name = img_info['file_name'].split('/')[-1].split('.')[0] + '.txt'
        out_file = os.path.join(YOLO_DIR, 'labels', target_split, file_name)
        
        lines = []
        for ann in anns:
            bbox = ann['bbox'] # [x, y, w, h]
            x_center = (bbox[0] + bbox[2]/2) / img_w
            y_center = (bbox[1] + bbox[3]/2) / img_h
            w = bbox[2] / img_w
            h = bbox[3] / img_h
            
            class_id = 0
            keypoints = ann['keypoints']
            kp_str = ""
            for i in range(0, len(keypoints), 3):
                px = keypoints[i] / img_w
                py = keypoints[i+1] / img_h
                v = keypoints[i+2]
                kp_str += f"{px:.6f} {py:.6f} {v} "
                
            line = f"{class_id} {x_center:.6f} {y_center:.6f} {w:.6f} {h:.6f} {kp_str.strip()}"
            lines.append(line)
            
        with open(out_file, 'w') as out_f:
            out_f.write("\n".join(lines) + "\n")
            
setup_dirs()
print("Processing training data...")
process_split('Keypoints_Train.json', 'Train', 'train')
print("Processing validation data...")
process_split('Keypoints_Validation.json', 'Validation', 'val')

yaml_content = f"""
path: {YOLO_DIR}
train: images/train
val: images/val

kpt_shape: [8, 3] # 8 keypoints, 3 coordinates each (x, y, visible)
names:
  0: cadera_pelvis
"""
with open(os.path.join(YOLO_DIR, 'dataset.yaml'), 'w') as f:
    f.write(yaml_content.strip())
print("Data preparation complete! dataset.yaml created.")
