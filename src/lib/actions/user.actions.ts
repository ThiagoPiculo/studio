
'use server';

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '../firebase/config';

export async function handleAvatarUpload(childId: string, base64Image: string) {
    try {
        if (!childId) {
            throw new Error('Child ID is required.');
        }
        if (!base64Image.startsWith('data:image/')) {
            throw new Error('Invalid image format.');
        }

        const storageRef = ref(storage, `avatars/${childId}/avatar.png`);
        
        // Convert base64 to a Blob, which is more robust for uploads
        const response = await fetch(base64Image);
        const blob = await response.blob();

        const metadata = {
            contentType: blob.type,
        };

        // Use uploadBytesResumable for a more robust upload process
        const uploadTask = uploadBytesResumable(storageRef, blob, metadata);

        // Wait for the upload to complete
        await uploadTask;

        // Get the download URL
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

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
