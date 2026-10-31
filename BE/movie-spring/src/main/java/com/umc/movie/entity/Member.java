package com.umc.movie.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "member")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "member_id")
    private Long memberId;

    @Column(
        name = "email",
        nullable = false,
        unique = true,
        length = 254
    )
    private String email;

    @Column(
        name = "password",
        nullable = false,
        length = 60
    )
    private String password;

    @Column(
        name = "nickname",
        nullable = false,
        unique = true,
        length = 50
    )
    private String nickname;

    @Builder
    public Member(
        String email,
        String password,
        String nickname
    ) {
        this.email = email;
        this.password = password;
        this.nickname = nickname;
    }
}