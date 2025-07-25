
'use server';

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebase/config';

export async function handleAvatarUpload(childId: string, base64Image: string) {
    try {
        if (!childId) {
            throw new Error('Child ID is required.');
        }
        
        const match = base64Image.match(/^data:(image\/[a-z]+);base64,(.+)$/);
        if (!match) {
            throw new Error('Invalid base64 image format.');
        }

        const contentType = match[1];
        const base64Data = match[2];
        
        // Convert base64 to a Buffer
        const imageBuffer = Buffer.from(base64Data, 'base64');

        const storageRef = ref(storage, `avatars/${childId}/avatar.png`);
        
        const metadata = {
            contentType: contentType,
        };

        // Upload the buffer
        const uploadResult = await uploadBytes(storageRef, imageBuffer, metadata);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        // Update the child's profile in Firestore
        const childRef = doc(db, 'children', childId);
        await updateDoc(childRef, {
            avatar: downloadURL,
            updatedAt: serverTimestamp(),
        });

        return { newUrl: downloadURL };
    } catch (error) {
        console.error('Error in handleAvatarUpload:', error);
        
        // Provide more specific error information if possible
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload avatar.';
        return { error: errorMessage };
    }
}
