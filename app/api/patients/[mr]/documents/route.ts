import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ mr: string }> }
) {
  try {
    const { mr } = await context.params;
    const documents = await prisma.document.findMany({
      where: { patientMr: decodeURIComponent(mr) },
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json({ documents });
  } catch (e) {
    console.error('Documents GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ mr: string }> }
) {
  try {
    const { mr } = await context.params;
    const body = await request.json();
    const { title, category, fileName, filePath, fileType, uploadedBy, remarks } = body;

    if (!title || !fileName || !filePath) {
      return NextResponse.json({ error: 'title, fileName, and filePath are required' }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({ where: { mr: decodeURIComponent(mr) } });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const document = await prisma.document.create({
      data: {
        patientMr: patient.mr,
        title,
        category,
        fileName,
        filePath,
        fileType,
        uploadedBy,
        remarks,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (e) {
    console.error('Documents POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ mr: string }> }
) {
  try {
    const { mr } = await context.params;
    const body = await request.json();
    const { id, title, category, fileName, filePath, fileType, uploadedBy, remarks } = body;

    if (!id) {
      return NextResponse.json({ error: 'Document id is required' }, { status: 400 });
    }

    const document = await prisma.document.update({
      where: { id },
      data: {
        title,
        category,
        fileName: fileName || undefined,
        filePath: filePath || undefined,
        fileType,
        uploadedBy: uploadedBy || undefined,
        remarks,
      },
    });

    return NextResponse.json({ document });
  } catch (e) {
    console.error('Documents PATCH error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ mr: string }> }
) {
  try {
    const { mr } = await context.params;
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Document id is required' }, { status: 400 });
    }

    await prisma.document.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Documents DELETE error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
