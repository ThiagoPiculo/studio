import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { subDays } from 'date-fns';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cutoffDate = subDays(serverTimestamp() as any, 30);

    const q = query(
      collection(db, 'familyInvitations'),
      where('createdAt', '<', cutoffDate)
    );

    const querySnapshot = await getDocs(q);

    querySnapshot.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });

    return NextResponse.json({ message: 'Successfully deleted old invitations' }, { status: 200 });

  } catch (error) {
    console.error('Failed to clear old invitations:', error);
    return NextResponse.json({ message: 'Failed to clear old invitations' }, { status: 500 });
  }
}
