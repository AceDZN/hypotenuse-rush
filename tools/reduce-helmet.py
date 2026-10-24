"""Finish the already meshoptimizer-reduced helmet with a small local decimation.
Blender --background --python tools/reduce-helmet.py -- source.glb destination.glb
"""
import bpy,bmesh,sys,json,pathlib
args=sys.argv[sys.argv.index('--')+1:]
source,destination=args
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(pathlib.Path(source).resolve()))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
before=sum(len(o.data.polygons) for o in meshes)
print('HELMET_IMPORTED',before,flush=True)
for obj in meshes:
    bpy.context.view_layer.objects.active=obj
    obj.data.validate(verbose=False, clean_customdata=True)
    topology=bmesh.new()
    topology.from_mesh(obj.data)
    bmesh.ops.remove_doubles(topology, verts=list(topology.verts), dist=1e-5)
    bmesh.ops.dissolve_degenerate(topology, edges=list(topology.edges), dist=1e-7)
    bmesh.ops.recalc_face_normals(topology, faces=list(topology.faces))
    topology.to_mesh(obj.data)
    topology.free()
    obj.data.update()
    modifier=obj.modifiers.new('small_equipment_decimation','DECIMATE')
    modifier.ratio=.06
    modifier.use_collapse_triangulate=True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.validate(verbose=False, clean_customdata=True)
    print('HELMET_DECIMATED',len(obj.data.polygons),flush=True)
for image in bpy.data.images:
    if max(image.size)>1024:
        factor=1024/max(image.size)
        image.scale(round(image.size[0]*factor),round(image.size[1]*factor))
bpy.ops.export_scene.gltf(filepath=str(pathlib.Path(destination).resolve()),export_format='GLB',export_image_format='JPEG',export_jpeg_quality=82,export_animations=False,export_cameras=False,export_lights=False,export_extras=False)
print('HELMET_FINISHED',json.dumps({'original_faces':before,'processed_faces':sum(len(o.data.polygons) for o in meshes)}),flush=True)
