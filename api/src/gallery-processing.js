import sharp from 'sharp';
import {Problem} from './domain.js';

export const GALLERY_IMAGE_SIZE={width:1800,height:1800,quality:84};
export const GALLERY_PREVIEW_SIZE={width:480,height:480,quality:78};

export async function optimizeGalleryPhoto(data){
 try{
  const metadata=await sharp(data,{limitInputPixels:40000000,animated:false}).metadata();
  if(!metadata.width||!metadata.height||metadata.pages>1)throw new Error('Unsupported image structure.');
  const full=await sharp(data,{limitInputPixels:40000000,animated:false}).rotate().resize({...GALLERY_IMAGE_SIZE,fit:'inside',withoutEnlargement:true}).webp({quality:GALLERY_IMAGE_SIZE.quality,effort:4}).toBuffer();
  const preview=await sharp(data,{limitInputPixels:40000000,animated:false}).rotate().resize({...GALLERY_PREVIEW_SIZE,fit:'inside',withoutEnlargement:true}).webp({quality:GALLERY_PREVIEW_SIZE.quality,effort:4}).toBuffer();
  return {full,preview};
 }catch{throw new Problem(400,'This photo could not be safely decoded or optimized. Try exporting it as a standard JPG, PNG or WebP.')}
}
