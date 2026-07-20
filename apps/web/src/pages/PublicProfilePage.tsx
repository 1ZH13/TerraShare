import { useEffect, useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { getOwnerPublicProfile, getUserReviews } from "../services/api";
import type { PublicOwnerProfileDto, ReviewDto } from "@terrashare/shared";
import { User, ShieldCheck, ArrowLeft, Star } from "lucide-react";

export default function PublicProfilePage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const [profile, setProfile] = useState<PublicOwnerProfileDto | null>(null);
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getOwnerPublicProfile(id),
      getUserReviews(id)
    ]).then(([profData, revData]) => {
      setProfile(profData);
      setReviews(revData);
    }).catch((err) => {
      setError("No se pudo cargar el perfil");
    }).finally(() => {
      setLoading(false);
    });
  }, [id]);

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
    : null;

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-600">
        Cargando perfil...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-8 text-center text-red-600">
        {error || "Perfil no encontrado"}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <Link to="/catalog" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft size={16} className="mr-1" /> Volver
      </Link>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="bg-gray-100 rounded-full p-6 text-gray-400">
            <User size={64} />
          </div>
          
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center justify-center sm:justify-start gap-2">
              {profile.displayName}
              {profile.verified && (
                <ShieldCheck className="text-green-600" size={24} aria-label="Verificado" />
              )}
            </h1>
            
            <p className="text-gray-500 mt-1">
              Miembro desde {new Date(profile.memberSince).toLocaleDateString("es-PA", { year: "numeric", month: "long" })}
            </p>

            {averageRating && (
              <div className="flex items-center justify-center sm:justify-start gap-1 mt-3">
                <Star size={18} className="fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-gray-900">{averageRating}</span>
                <span className="text-gray-500">
                  ({reviews.length} {reviews.length === 1 ? "reseña" : "reseñas"})
                </span>
              </div>
            )}
          </div>
        </div>

        {reviews.length > 0 && (
          <div className="border-t border-gray-200 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Reseñas</h2>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}
                      />
                    ))}
                    <span className="text-sm text-gray-500 ml-2">
                      {new Date(review.createdAt).toLocaleDateString("es-PA")}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-gray-700 text-sm mt-1">"{review.comment}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
