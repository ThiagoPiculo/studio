
'use server';

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { db, storage } from '../firebase/config';

export async function handleAvatarUpload(childId: string, base64Image: string) {
    try {
        if (!childId) {
            throw new Error('Child ID is required.');
        }

        const storageRef = ref(storage, `avatars/${childId}/avatar.png`);

        // Upload the base64 string
        const snapshot = await uploadString(storageRef, base64Image, 'data_url');

        // Get the download URL
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Update the child's profile in Firestore
        const childRef = doc(db, 'children', childId);
        await updateDoc(childRef, {
            avatar: downloadURL,
            updatedAt: serverTimestamp(),
        });

        return { newUrl: downloadURL };
    } catch (error) {
        console.error('Error in handleAvatarUpload:', error);
        return { error: 'Failed to upload avatar.' };
    }
}
