import { redirect } from "next/navigation";

export default function VideoRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/videos/${params.id}`);
}
