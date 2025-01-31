import React from 'react';
import ArtistCard from './ArtistCard';
import './TopArtists.css';

const one = (
    <ArtistCard 
    artistName = 'Taylor Swift'
    img = 'https://i.scdn.co/image/ab67616100005174e672b5f553298dcdccb0e676'
    />
)

const two = (
    <ArtistCard 
    artistName = 'The Weeknd'
    img = 'https://i.scdn.co/image/ab676161000051749e528993a2820267b97f6aae'
    />
)

const three = (
    <ArtistCard 
    artistName = 'Bad Bunny'
    img = 'https://i.scdn.co/image/ab67616100005174744a4243fb6cc938011a98f4'
    />
)

const four = (
    <ArtistCard 
    artistName = 'Drake'
    img = 'https://i.ebayimg.com/images/g/ovAAAOSwsulmLKPp/s-l1600.webp'
    />
)

const five = (
    <ArtistCard 
    artistName = 'Billie Eilish'
    img = 'https://i.scdn.co/image/ab676161000051744a21b4760d2ecb7b0dcdc8da'
    />
)

const six = (
    <ArtistCard 
    artistName = 'Travis Scott'
    img = 'https://i.scdn.co/image/ab6761610000517419c2790744c792d05570bb71'
    />
)

const seven = (
    <ArtistCard 
    artistName = 'Peso Pluma'
    img = 'https://i.scdn.co/image/ab67616100005174e5283f5b671cf618b82a2696'
    />
)

const eight = (
    <ArtistCard 
    artistName = 'Kanye West'
    img = 'https://i.scdn.co/image/ab676161000051746e835a500e791bf9c27a422a'
    />
)

const nine = (
    <ArtistCard 
    artistName = 'Ariana Grande'
    img = 'https://i.scdn.co/image/ab6761610000517440b5c07ab77b6b1a9075fdc0'
    />
)

const ten = (
    <ArtistCard 
    artistName = 'Feid'
    img = 'https://photos.bandsintown.com/thumb/19696920.jpeg'
    />
)



function TopArtists() {
    return (
        <div>
            <h2 className='school-results'>Your Community's Top Artists </h2>
            <br></br>
            <div className='artist-list'>
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

export default TopArtists;