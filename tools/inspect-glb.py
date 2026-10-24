"""Check bundled GLB containment, mesh size, maps, normals, and SHA-256."""
import pathlib,struct,json,hashlib,math
ROOT=pathlib.Path(__file__).resolve().parents[1]
def jpeg_size(data):
    i=2
    while i<len(data)-9:
        if data[i]!=255:i+=1;continue
        while data[i]==255:i+=1
        marker=data[i];i+=1
        if marker in (0xD8,0xD9):continue
        length=int.from_bytes(data[i:i+2],'big')
        if marker in (0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF):
            return [int.from_bytes(data[i+5:i+7],'big'),int.from_bytes(data[i+3:i+5],'big')]
        i+=length
    raise ValueError('JPEG dimensions unavailable')
reports=[]
for p in sorted((ROOT/'public/models').glob('*.glb')):
    data=p.read_bytes();magic,version,total=struct.unpack_from('<III',data)
    assert magic==0x46546C67 and version==2 and total==len(data)
    n,kind=struct.unpack_from('<II',data,12);document=json.loads(data[20:20+n]);binary=data[28+n:]
    assert all('uri' not in x for x in document.get('buffers',[])+document.get('images',[])), 'Runtime asset must be self contained'
    assert not document.get('extensionsRequired'), 'Unexpected decoder requirement'
    triangles=vertices=0;bounds=[]
    for m in document['meshes']:
        for primitive in m['primitives']:
            assert primitive.get('mode',4)==4
            position=document['accessors'][primitive['attributes']['POSITION']]
            vertices+=position['count'];triangles+=document['accessors'][primitive['indices']]['count']//3
            bounds.append({'min':position['min'],'max':position['max']})
            assert 'NORMAL' in primitive['attributes'] and 'TEXCOORD_0' in primitive['attributes']
            normal=document['accessors'][primitive['attributes']['NORMAL']];view=document['bufferViews'][normal['bufferView']]
            assert normal['componentType']==5126
            offset=view.get('byteOffset',0)+normal.get('byteOffset',0);stride=view.get('byteStride',12)
            for i in range(0,normal['count'],max(1,normal['count']//100)):
                v=struct.unpack_from('<fff',binary,offset+i*stride)
                assert all(math.isfinite(x) for x in v) and .5<sum(x*x for x in v)<1.5
    images=[]
    for image in document['images']:
        view=document['bufferViews'][image['bufferView']];start=view.get('byteOffset',0);pixels=binary[start:start+view['byteLength']]
        assert image['mimeType']=='image/jpeg'
        dimensions=jpeg_size(pixels);assert max(dimensions)<=1024
        images.append({'mimeType':image['mimeType'],'dimensions':dimensions,'bytes':len(pixels)})
    reports.append({'file':str(p.relative_to(ROOT)),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'triangles':triangles,'vertices':vertices,'meshes':len(document['meshes']),'materials':len(document['materials']),'skins':len(document.get('skins',[])),'animations':len(document.get('animations',[])),'requiredExtensions':document.get('extensionsRequired',[]),'images':images,'positionBounds':bounds,'checks':'self contained; indices/UVs/normals present; sampled normals finite/unit length; JPEG textures <=1024px'})
output=ROOT/'docs/ASSET_INSPECTION.json';output.write_text(json.dumps(reports,indent=2)+'\n');print(json.dumps(reports,indent=2))
