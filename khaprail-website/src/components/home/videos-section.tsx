import { Link } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { VideoGrid } from "@/components/videos/video-grid"
import { useVideos } from "@/hooks/use-videos"

const HOMEPAGE_VIDEO_LIMIT = 8

export function VideosSection() {
  const { videos, isLoading, error } = useVideos(HOMEPAGE_VIDEO_LIMIT)

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <h2 className="font-heading text-4xl font-semibold sm:text-5xl">From the Workshop</h2>
        <p className="mt-2 text-muted-foreground">See our tiles being made and installed.</p>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full rounded-lg" />
          ))}
        </div>
      ) : error || videos.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          We're putting together videos of our workshop and tile-making process. Check back soon.
        </p>
      ) : (
        <VideoGrid videos={videos} />
      )}
      {!isLoading && !error && videos.length > 0 && (
        <div className="mt-8 text-center">
          <Link to="/videos" className="text-sm font-medium text-primary hover:underline">
            View All Videos
          </Link>
        </div>
      )}
    </section>
  )
}
