"""Offline optimization of the owner's normal Chrome/Tripo GLB exports.
Run: Blender --background --python tools/optimize_tripo.py
No generation, provider API, secrets, remote fetch, or colliders.
"""
import bpy, pathlib, json
ROOT=pathlib.Path(__file__).resolve().parents[1]
DOWNLOADS=pathlib.Path('/Users/acedzn/Downloads')
summary=[]
for source_name,target_name,ratio in [
 ('hypotenuse-rush-sandstone-arch.glb','sandstone-arch.glb',.035),
 ('hypotenuse-rush-runner-helmet.glb','runner-helmet.glb',.008),
]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source=DOWNLOADS/source_name
    bpy.ops.import_scene.gltf(filepath=str(source))
    before=sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')
    for obj in list(bpy.context.scene.objects):
        if obj.type!='MESH': continue
        bpy.context.view_layer.objects.active=obj
        modifier=obj.modifiers.new('browser_decimation','DECIMATE')
        modifier.ratio=ratio
        modifier.use_collapse_triangulate=True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        for p in obj.data.polygons:p.use_smooth=True
    after=sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')
    for image in bpy.data.images:
        if image.size[0]>1024 or image.size[1]>1024:
            scale=1024/max(image.size)
            image.scale(round(image.size[0]*scale),round(image.size[1]*scale))
    output=ROOT/'public'/'models'/target_name
    bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',export_image_format='JPEG',export_jpeg_quality=82,export_animations=False,export_cameras=False,export_lights=False,export_extras=False)
    summary.append(dict(file=target_name,original_faces=before,processed_faces=after,ratio=ratio,bytes=output.stat().st_size))
print('OPTIMIZATION',json.dumps(summary))
