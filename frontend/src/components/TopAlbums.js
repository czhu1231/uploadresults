import React from 'react';
import TrackCard from './TrackCard';
import './TopAlbums.css';
//use props!

const one = (
    <TrackCard 
        albumName= 'Espresso'
        artistName = 'Sabrina Carpenter'
        img = 'https://i.scdn.co/image/ab67616d00001e02659cd4673230913b3918e0d5'
    />
)

const two = (
    <TrackCard
        albumName= 'Beautiful Things'
        artistName = 'Benson Boone'
        img = 'https://i.scdn.co/image/ab67616d00001e02bef221ea02a821e7feeda9cf'
    />
)

const three = (
    <TrackCard 
        albumName= 'BIRDS OF A FEATHER'
        artistName = 'Billie Eilish'
        img = 'https://i.scdn.co/image/ab67616d00001e0271d62ea7ea8a5be92d3c1f62'
    />
)

const four = (
    <TrackCard 
        albumName= 'Gata Only'
        artistName = 'FloyyMenor, Cris Mj'
        img = 'https://i.scdn.co/image/ab67616d00001e02c4583f3ad76630879a75450a'
    />
)

const five = (
    <TrackCard 
        albumName= 'Lose Control'
        artistName = 'Teddy Swims'
        img = 'https://i.scdn.co/image/ab67616d00001e021d856e66d33e22746c21a09c'
    />
)

const six = (
    <TrackCard 
        albumName= 'End of Beginning'
        artistName = 'Djo'
        img = 'https://i.scdn.co/image/ab67616d00001e02fddfffec51b4580acae727c1'
    />
)

const seven = (
    <TrackCard 
        albumName= 'Too Sweet'
        artistName = 'Hozier'
        img = 'https://i.scdn.co/image/ab67616d00001e02a5aab55aa65e5f6bd19564a2'
    />
)

const eight = (
    <TrackCard 
        albumName= 'One Of The Girls'
        artistName = 'The Weeknd'
        img = 'https://i.scdn.co/image/ab67616d00001e02b0dd6a5cd1dec96c4119c262'
    />
)

const nine = (
    <TrackCard 
        albumName='Cruel Summer'
        artistName = 'Taylor Swift'
        img = 'https://i.scdn.co/image/ab67616d00001e02e787cffec20aa2a396a61647'
    />
)

const ten = (
    <TrackCard 
        albumName= 'Die With A Smile'
        artistName = 'Bruno Mars, Lady Gaga'
        img = 'https://i.scdn.co/image/ab67616d00001e0282ea2e9e1858aa012c57cd45'
    />
)




function TopAlbums() {
    return (
        <div>
            <h2 className = 'school-results'>Your Community's Top Tracks </h2>
            <br></br>
            <div className = 'track-list'>
            {one}
            {two}
            {three}
            {four}
            {five}
            {six}
            {seven}
            {eight}
            {nine}
            {ten}
            </div>
        </div>
    )
}

export default TopAlbums;