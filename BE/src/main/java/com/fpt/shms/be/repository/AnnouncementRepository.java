package com.fpt.shms.be.repository;

import com.fpt.shms.be.model.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    /**
     * Return only active announcements, newest first.
     */
    @Query("select a from Announcement a where a.status is null or upper(a.status) = 'ACTIVE' order by a.publishedAt desc")
    List<Announcement> findByIsActiveTrueOrderByPublishedAtDesc();
}
