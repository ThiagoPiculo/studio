import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { subDays } from 'date-fns';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Correctly calculate the cutoff date using the server's current time.
    // serverTimestamp() is a sentinel value for writes, not for calculations.
    const cutoffDate = subDays(new Date(), 30);

    const q = query(
      collection(db, 'familyInvitations'),
      where('createdAt', '<', cutoffDate)
    );

    const querySnapshot = await getDocs(q);
    const deletionPromises: Promise<void>[] = [];
    querySnapshot.forEach((doc) => {
      deletionPromises.push(deleteDoc(doc.ref));
    });

    await Promise.all(deletionPromises);

    return NextResponse.json({ message: `Successfully deleted ${deletionPromises.length} old invitations` }, { status: 200 });

  } catch (error) {
    console.error('Failed to clear old invitations:', error);
    return NextResponse.json({ message: 'Failed to clear old invitations' }, { status: 500 });
  }
}
