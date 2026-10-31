package com.umc.movie.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "rating",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_rating_member_movie",
            columnNames = {
                "member_id",
                "movie_id"
            }
        )
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Rating extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rating_id")
    private Long ratingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "member_id",
        nullable = false
    )
    private Member member;

    @Column(
        name = "movie_id",
        nullable = false
    )
    private Long movieId;

    @Column(
        name = "score",
        nullable = false,
        columnDefinition = "TINYINT"
    )
    private Integer score;

    @Column(
        name = "comment",
        columnDefinition = "TEXT"
    )
    private String comment;

    @Builder
    public Rating(
        Member member,
        Long movieId,
        Integer score,
        String comment
    ) {
        this.member = member;
        this.movieId = movieId;
        this.score = score;
        this.comment = comment;
    }

    public void update(
        Integer score,
        String comment
    ) {
        this.score = score;
        this.comment = comment;
    }
}