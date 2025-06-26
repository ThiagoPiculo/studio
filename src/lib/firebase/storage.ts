
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth } from "./config";

const storage = getStorage();

export const uploadAvatar = async (file: File, childId: string): Promise<string> => {
    if (!auth.currentUser) {
        throw new Error("Usuário não autenticado.");
    }

    const fileExtension = file.name.split('.').pop();
    // Use a combination of timestamp and a random string for uniqueness
    const fileName = `${new Date().getTime()}-${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
    const storageRef = ref(storage, `avatars/${childId}/${fileName}`);

    const metadata = {
        contentType: file.type,
    };
    
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
};

    